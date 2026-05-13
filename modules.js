// ============================================================
// modules.js — BringIT Proposal Builder · Data Source
// ============================================================
//
// STRUCTURE:
//   MODULES (array of Sections)
//   └── Section  { name }
//       └── features (array of Modules)
//           └── Module  { id, name, features, trigger? }
//               └── features (array of Features)
//                   └── Feature  { id, name, detail?, hint?, children?, trigger?, defaultWhenParentSelected? }
//                       └── children (array of Children)
//                           └── Child { id, name, ... }
//                               └── children (array of Grandchildren)
//
// The builder derives FLAT_MODULES from this structure for rendering.
// The admin UI works directly with the section-wrapped structure.
//
// ── FIELD REFERENCE ──────────────────────────────────────────
//  id          Dot-notation string. NEVER change after first deploy.
//  name        Display label.
//  detail      Input widget:
//                "text"       single-line free text
//                "number"     numeric input
//                "list_ref"   checkboxes pulled from LISTS[listRef]
//                "repeatable" dynamic "+ Add" row (see repeatableFields)
//                "radio"      mutually exclusive pills (see options[])
//  hint        Placeholder text shown inside the input.
//  listRef     Key into LISTS — required when detail = "list_ref".
//  options     String array — required when detail = "radio".
//  repeatableFields  Array of field definitions rendered per repeatable row:
//                    [{ name, detail, hint?, listRef? }]
//  defaultDetail     Pre-filled value for number inputs (e.g. "1").
//  defaultWhenParentSelected
//              true  → auto-select this child when its parent is checked
//                      (corresponds to BLACK items in the PDF)
//              absent/false → user must actively select
//                             (corresponds to BLUE items in the PDF)
//  trigger     Visibility condition — hides item until condition is met:
//              { featureId: "x.x" }
//                show when feature x.x is included
//              { featureId: "x.x", value: "val" }
//                show when feature x.x detail equals val
//              { moduleGroupId: "group_id" }
//                show when group button group_id is pressed
//              Applied at both module level and feature level.
//
// ── RENDERER NOTES ───────────────────────────────────────────
//  The builder must derive FLAT_MODULES for its rendering:
//    const FLAT_MODULES = MODULES.flatMap(s => s.features || []);
//  Use FLAT_MODULES everywhere the builder iterates modules.
//  Use MODULES (sectioned) for the admin UI.
//
//  "repeatable" detail type needs a new renderer case that:
//    1. Renders the first instance of repeatableFields inline
//    2. Shows a "+ Add [name]" button below
//    3. Each click appends another instance of the fields
//    4. Saves as JSON array to feature state
//
//  Module-level trigger: modules with trigger property are hidden
//  in the sidebar until their condition is met.
// =============================================================

// ── Shared Lists ──────────────────────────────────────────────
// Each key is a list ID referenced by detail:"list_ref" features.
// Each value is an array of option objects:
//   { label, type: "checkbox" }  → renders as a checkbox
//   { label, type: "text", hint }  → renders as a labeled text input
// ─────────────────────────────────────────────────────────────

const LISTS = {

  currency_list: [
    { label: "USD",   type: "checkbox", isDefault: true },
    { label: "EUR",   type: "checkbox" },
    { label: "CAD",   type: "checkbox" },
    { label: "MXN",   type: "checkbox" },
    { label: "GBP",   type: "checkbox" },
    { label: "BRL",   type: "checkbox" },
    { label: "COP",   type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify currency code" }
  ],

  languages_list: [
    { label: "English",    type: "checkbox", isDefault: true },
    { label: "Spanish",    type: "checkbox" },
    { label: "Portuguese", type: "checkbox" },
    { label: "Dutch",      type: "checkbox" },
    { label: "Other",      type: "text", hint: "Specify language" }
  ],

  integration_platform: [
    { label: "NS Adv Elect Pmt",                        type: "checkbox" },
    { label: "Manual CSV",                              type: "checkbox" },
    { label: "Automated CSV Import via SFTP Server",    type: "checkbox" },
    { label: "SuiteApp – Customer to Acquire SuiteApp", type: "checkbox" },
    { label: "Pre-Built Adapter",                       type: "checkbox" },
    { label: "Customer to Acquire Pre-Built Adapter",   type: "checkbox" },
    { label: "ODBC/JDBC Connector (To Be Acquired)",    type: "checkbox" },
    { label: "Middleware – Boomi",                      type: "checkbox" },
    { label: "Middleware – Celigo",                     type: "checkbox" },
    { label: "Middleware – Workato",                    type: "checkbox" },
    { label: "Middleware – NSIP",                       type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify platform" }
  ],

  shipping_carrier_list: [
    { label: "UPS",   type: "checkbox" },
    { label: "FedEx", type: "checkbox" },
    { label: "USPS",  type: "checkbox" },
    { label: "DHL",   type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify carrier" }
  ],

  delivery_method_list: [
    { label: "Email", type: "checkbox" },
    { label: "Mail",  type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify delivery method" }
  ],

  customer_payments_list: [
    { label: "Cash",        type: "checkbox" },
    { label: "Check",       type: "checkbox" },
    { label: "EFT",         type: "checkbox" },
    { label: "Credit Card", type: "checkbox" },
    { label: "Other",       type: "text", hint: "Specify payment method" }
  ],

  inventory_costing_list: [
    { label: "Average",  type: "checkbox" },
    { label: "FIFO",     type: "checkbox" },
    { label: "LIFO",     type: "checkbox" },
    { label: "Standard", type: "checkbox" },
    { label: "Specific", type: "checkbox" },
    { label: "Other",    type: "text", hint: "Specify costing method" }
  ],

  demand_plans_list: [
    { label: "Historical - Linear Regression, Moving Average", type: "checkbox" },
    { label: "Sales Forecast",                                 type: "checkbox" },
    { label: "Manual",                                         type: "checkbox" },
    { label: "CSV Upload",                                     type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify demand plan type" }
  ],

  forecasting_list: [
    { label: "Monthly",   type: "checkbox" },
    { label: "Quarterly", type: "checkbox" },
    { label: "Annually",  type: "checkbox" },
    { label: "Other",     type: "text", hint: "Specify forecasting period" }
  ],

  // Placeholder — awaiting team input
  sales_tax_type_list: [],

  tax_model_list: [
    { label: "Sales Tax",  type: "checkbox" },
    { label: "Use Tax",    type: "checkbox" },
    { label: "Excise Tax", type: "checkbox" }
  ],

  // Integration "Existing Solution" pickers
  bank_list: [
    { label: "JPMorgan Chase",                     type: "checkbox" },
    { label: "Bank of America",                    type: "checkbox" },
    { label: "Citigroup",                          type: "checkbox" },
    { label: "Wells Fargo",                        type: "checkbox" },
    { label: "Goldman Sachs",                      type: "checkbox" },
    { label: "Morgan Stanley",                     type: "checkbox" },
    { label: "U.S. Bancorp",                       type: "checkbox" },
    { label: "PNC Financial Services",             type: "checkbox" },
    { label: "Truist Financial",                   type: "checkbox" },
    { label: "Royal Bank of Canada",               type: "checkbox" },
    { label: "Toronto-Dominion Bank",              type: "checkbox" },
    { label: "Scotiabank",                         type: "checkbox" },
    { label: "Bank of Montreal",                   type: "checkbox" },
    { label: "Canadian Imperial Bank of Commerce", type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify bank name" }
  ],

  creditcard_list: [
    { label: "Visa",   type: "checkbox" },
    { label: "Master", type: "checkbox" },
    { label: "AMEX",   type: "checkbox" },
    { label: "Other",  type: "text", hint: "Specify card provider" }
  ],

  expensereporting_list: [
    { label: "Expensify",    type: "checkbox" },
    { label: "SAP Concur",   type: "checkbox" },
    { label: "Ramp",         type: "checkbox" },
    { label: "Brex",         type: "checkbox" },
    { label: "Zoho Expense", type: "checkbox" },
    { label: "Emburse",      type: "checkbox" },
    { label: "Coupa",        type: "checkbox" },
    { label: "Divvy",        type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify expense system" }
  ],

  billpay_list: [
    { label: "Bill.com",    type: "checkbox" },
    { label: "Tipalti",     type: "checkbox" },
    { label: "Melio",       type: "checkbox" },
    { label: "AvidXchange", type: "checkbox" },
    { label: "Airbase",     type: "checkbox" },
    { label: "MineralTree", type: "checkbox" },
    { label: "Stampli",     type: "checkbox" },
    { label: "Paystand",    type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify bill pay system" }
  ],

  taxsolution_list: [
    { label: "Avalara",                     type: "checkbox" },
    { label: "TaxJar",                      type: "checkbox" },
    { label: "Vertex",                      type: "checkbox" },
    { label: "ONESOURCE (Thomson Reuters)", type: "checkbox" },
    { label: "Sovos",                       type: "checkbox" },
    { label: "SuiteTax",                    type: "checkbox" },
    { label: "Drake Tax",                   type: "checkbox" },
    { label: "H&R Block Software",          type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify tax engine" }
  ],

  timeentry_list: [
    { label: "Jira",            type: "checkbox" },
    { label: "Smartsheet",      type: "checkbox" },
    { label: "Toggl Track",     type: "checkbox" },
    { label: "Harvest",         type: "checkbox" },
    { label: "Clockify",        type: "checkbox" },
    { label: "Replicon",        type: "checkbox" },
    { label: "Hubstaff",        type: "checkbox" },
    { label: "QuickBooks Time", type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify time entry system" }
  ],

  crm_list: [
    { label: "Salesforce",             type: "checkbox" },
    { label: "HubSpot",                type: "checkbox" },
    { label: "Microsoft Dynamics 365", type: "checkbox" },
    { label: "Zoho CRM",               type: "checkbox" },
    { label: "Pipedrive",              type: "checkbox" },
    { label: "Freshsales",             type: "checkbox" },
    { label: "SugarCRM",               type: "checkbox" },
    { label: "Insightly",              type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify CRM system" }
  ],

  accountinginfo_list: [
    { label: "FloQast",   type: "checkbox" },
    { label: "BlackLine", type: "checkbox" },
    { label: "Trintech",  type: "checkbox" },
    { label: "Planful",   type: "checkbox" },
    { label: "Workiva",   type: "checkbox" },
    { label: "Vena",      type: "checkbox" },
    { label: "OneStream", type: "checkbox" },
    { label: "Prophix",   type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify accounting info system" }
  ],

  paymentgateway_list: [
    { label: "Stripe",        type: "checkbox" },
    { label: "PayPal",        type: "checkbox" },
    { label: "Authorize.net", type: "checkbox" },
    { label: "Square",        type: "checkbox" },
    { label: "Adyen",         type: "checkbox" },
    { label: "Braintree",     type: "checkbox" },
    { label: "Paystand",      type: "checkbox" },
    { label: "VersaPay",      type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify payment gateway" }
  ],

  fpa_list: [
    { label: "Adaptive Insights", type: "checkbox" },
    { label: "Vena",              type: "checkbox" },
    { label: "Planful",           type: "checkbox" },
    { label: "Anaplan",           type: "checkbox" },
    { label: "Prophix",           type: "checkbox" },
    { label: "Jedox",             type: "checkbox" },
    { label: "Board",             type: "checkbox" },
    { label: "Cube",              type: "checkbox" },
    { label: "Martus",            type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify FP&A system" }
  ],

  edi_list: [
    { label: "SPS Commerce",  type: "checkbox" },
    { label: "TrueCommerce",  type: "checkbox" },
    { label: "DiCentral",     type: "checkbox" },
    { label: "Orderful",      type: "checkbox" },
    { label: "Boomi",         type: "checkbox" },
    { label: "Cleo",          type: "checkbox" },
    { label: "OpenText",      type: "checkbox" },
    { label: "IBM Sterling",  type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify EDI system" }
  ],

  ecommerce_list: [
    { label: "Shopify",                   type: "checkbox" },
    { label: "Magento (Adobe Commerce)",  type: "checkbox" },
    { label: "BigCommerce",               type: "checkbox" },
    { label: "WooCommerce",               type: "checkbox" },
    { label: "Salesforce Commerce Cloud", type: "checkbox" },
    { label: "Squarespace",               type: "checkbox" },
    { label: "Wix",                       type: "checkbox" },
    { label: "SAP Commerce Cloud",        type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify eCommerce platform" }
  ],

  datawarehouse_list: [
    { label: "Microsoft Power BI", type: "checkbox" },
    { label: "Tableau",            type: "checkbox" },
    { label: "Databricks",         type: "checkbox" },
    { label: "Domo",               type: "checkbox" },
    { label: "Qlik Sense",         type: "checkbox" },
    { label: "Sisense",            type: "checkbox" },
    { label: "Snowflake",          type: "checkbox" },
    { label: "Amazon Redshift",    type: "checkbox" },
    { label: "Other", type: "text", hint: "Specify data warehouse solution" }
  ]

};

// ── Module Groups ─────────────────────────────────────────────
// Named buttons rendered in the builder alongside "Select All".
// moduleIds: integer IDs of modules where the button appears.
// Features/modules with trigger.moduleGroupId = this group's id
// become visible when the button is pressed.
// ─────────────────────────────────────────────────────────────

const MODULE_GROUPS = [
  { id: "fixed_asset_management",       label: "Fixed Asset Management",       moduleIds: [1]      },
  { id: "advanced_financials",          label: "Advanced Financials",           moduleIds: [1]      },
  { id: "advanced_inventory",           label: "Advanced Inventory",            moduleIds: [4, 13]  },
  { id: "advanced_procurement",         label: "Advanced Procurement",          moduleIds: [4]      },
  { id: "bill_capture",                 label: "Bill Capture",                  moduleIds: [4]      },
  { id: "advanced_revenue_recognition", label: "Advanced Revenue Recognition",  moduleIds: [7]      },
  { id: "advanced_demand_planning",     label: "Advanced Demand Planning",      moduleIds: [13]     },
  { id: "smart_count",                  label: "Smart Count",                   moduleIds: [13]     }
];

// ── Modules ───────────────────────────────────────────────────
// Top-level array = Sections (no id).
// section.features = Modules (have integer id).
// module.features  = Features (have dot-notation string id).
// feature.children = Children (dot-notation string id).
// child.children   = Grandchildren (dot-notation string id).
// ─────────────────────────────────────────────────────────────

const MODULES = [

  // ══════════════════════════════════════════════════════════
  {
    name: "Record to Report",
    features: [

      // ── Module 1: Financial Management ───────────────────
      {
        id: 1, name: "Financial Management",
        children: [
          { id:"1.1", name:"Single Entity / Multi-Entity",
            detail: "either_or",
            hint: "Select entity structure",
            eitherOrOptions: [
              { label: "Single Entity", showsChildren: false },
              { label: "Multi-Entity",  showsChildren: true  }
            ],
            children:[
            { id:"1.1.1", name:"Parent", defaultWhenParentSelected:true, children:[
              { id:"1.1.1.1", name:"Holding" },
              { id:"1.1.1.2", name:"Consolidation" }
            ]},
            { id:"1.1.2", name:"Operating Subsidiaries", defaultWhenParentSelected:true, children:[
              { id:"1.1.2.1", name:"Subsidiaries", detail:"repeatable",
                repeatableFields:[
                  { name:"Name",     detail:"text",     hint:"Subsidiary name" },
                  { name:"Currency", detail:"list_ref",  listRef:"currency_list" }
                ]
              }
            ]},
            { id:"1.1.3", name:"Eliminations Entity (Interco Only)" }
          ]},
          { id:"1.2", name:"Languages", children:[
            { id:"1.2.1", name:"Languages", detail:"list_ref", listRef:"languages_list",
              hint:"Select all languages. For others, type in the Other field separated by commas." }
          ]},
          { id:"1.3", name:"Fiscal Calendar", children:[
            { id:"1.3.1", name:"Calendar", defaultWhenParentSelected:true },
            { id:"1.3.2", name:"Custom",   detail:"text", hint:"Describe custom calendar" }
          ]},
          { id:"1.4", name:"Transactional Currencies", children:[
            { id:"1.4.1", name:"Currencies", detail:"list_ref", listRef:"currency_list",
              hint:"Select all transactional currencies. Use Other for additional currencies." }
          ]},
          { id:"1.5", name:"Accounting Periods", children:[
            { id:"1.5.1", name:"Calendar", defaultWhenParentSelected:true },
            { id:"1.5.2", name:"4-4-5" },
            { id:"1.5.3", name:"Other", detail:"text", hint:"Describe custom period" }
          ]},
          { id:"1.6",  name:"General Ledger" },
          { id:"1.7",  name:"Chart of Accounts" },
          { id:"1.8",  name:"Financial Segments", children:[
            { id:"1.8.1", name:"Natural Account", defaultWhenParentSelected:true },
            { id:"1.8.2", name:"Department",      defaultWhenParentSelected:true },
            { id:"1.8.3", name:"Class",           defaultWhenParentSelected:true },
            { id:"1.8.4", name:"Location",        defaultWhenParentSelected:true },
            { id:"1.8.5", name:"Custom Segments", detail:"text", hint:"Specify custom segment names" }
          ]},
          { id:"1.9",  name:"Accounts Payable" },
          { id:"1.10", name:"Accounts Receivable" },
          { id:"1.11", name:"Journal Entries", children:[
            { id:"1.11.1", name:"Standard",  defaultWhenParentSelected:true },
            { id:"1.11.2", name:"Recurring", defaultWhenParentSelected:true },
            { id:"1.11.3", name:"Reversing", defaultWhenParentSelected:true }
          ]},
          { id:"1.12", name:"Banking", children:[
            { id:"1.12.1", name:"Bank & Credit Card Reconciliation", defaultWhenParentSelected:true },
            { id:"1.12.2", name:"Transfers and Deposits",            defaultWhenParentSelected:true },
            { id:"1.12.3", name:"Electronic Bank Payments",          defaultWhenParentSelected:true }
          ]},
          { id:"1.13", name:"Intercompany Management", trigger:{ featureId:"1.1.3" } },
          { id:"1.14", name:"Sales Tax Management", children:[
            { id:"1.14.1", name:"Tax Configuration", detail:"repeatable",
              repeatableFields:[
                { name:"Tax Model",       detail:"list_ref", listRef:"tax_model_list" },
                { name:"Number of Nexus", detail:"number",   hint:"Number of nexuses" }
              ]
            },
            { id:"1.14.2", name:"Avalara" }
          ]},
          { id:"1.15", name:"Period Close Management" },
          { id:"1.16", name:"Budget vs Actual" },
          { id:"1.17", name:"Financial Reports & KPIs" },
          { id:"1.18", name:"Approval Workflows", children:[
            { id:"1.18.1", name:"Approval Workflow", detail:"text", hint:"Describe workflow" },
            { id:"1.18.2", name:"+ Add Approval Workflow", detail:"repeatable",
              repeatableFields:[{ name:"Approval Workflow", detail:"text", hint:"Describe workflow" }]
            }
          ]},
          { id:"1.19", name:"Statistical Accounts", trigger:{ moduleGroupId:"advanced_financials" } },
          { id:"1.20", name:"Allocations",           trigger:{ moduleGroupId:"advanced_financials" } },
          { id:"1.21", name:"Amortizations",         trigger:{ moduleGroupId:"advanced_financials" } },
          { id:"1.22", name:"Multiple Budgets",       trigger:{ moduleGroupId:"advanced_financials" } }
        ]
      },

      // ── Module 2: Fixed Asset Management (FAM) ───────────
      {
        id: 2, name: "Fixed Asset Management (FAM)",
        trigger: { moduleGroupId:"fixed_asset_management" },
        children: [
          { id:"2.1", name:"Acquire, Depreciate, Retire, Transfer and Revalue Assets" },
          { id:"2.2", name:"Comprehensive Support for Depreciation" },
          { id:"2.3", name:"Real-Time Fixed Assets Reporting" },
          { id:"2.4", name:"Tax Depreciation" }
        ]
      },

    ]
  },

  // ══════════════════════════════════════════════════════════
  {
    name: "Avalara",
    features: [
      {
        id: 3, name: "Avalara",
        trigger: { featureId:"1.14.2" },
        children: [
          { id:"3.1", name:"Gathering Business Requirements", children:[
            { id:"3.1.1", name:"AvaTax",                      defaultWhenParentSelected:true },
            { id:"3.1.2", name:"Returns",                     defaultWhenParentSelected:true },
            { id:"3.1.3", name:"Streamlined Sales Tax (SST)", defaultWhenParentSelected:true }
          ]},
          { id:"3.2", name:"Setup of AvaTax", children:[
            { id:"3.2.1", name:"Tax Compliance",                          defaultWhenParentSelected:true },
            { id:"3.2.2", name:"Streamlined Sales Tax (SST)",             defaultWhenParentSelected:true },
            { id:"3.2.3", name:"Connect the Business Systems to AvaTax",  defaultWhenParentSelected:true },
            { id:"3.2.4", name:"Installation",                            defaultWhenParentSelected:true },
            { id:"3.2.5", name:"Allowance",                               defaultWhenParentSelected:true }
          ]},
          { id:"3.3", name:"Setup Exemptions", children:[
            { id:"3.3.1", name:"Standard Configuration", defaultWhenParentSelected:true },
            { id:"3.3.2", name:"Prep & Load Exemptions",  defaultWhenParentSelected:true }
          ]},
          { id:"3.4", name:"Setup Returns" },
          { id:"3.5", name:"Import Transactions from Other Systems" },
          { id:"3.6", name:"Test & Refine Automated Tax Determination" },
          { id:"3.7", name:"First Filing (Reconciliation / Approval)" }
        ]
      }
    ]
  },

  // ══════════════════════════════════════════════════════════
  {
    name: "Procure to Pay",
    features: [

      // ── Module 4: Procurement ─────────────────────────────
      {
        id: 4, name: "Procurement",
        children: [
          { id:"4.1",  name:"Vendor Records & Vendor Center" },
          { id:"4.2",  name:"Employee Records" },
          { id:"4.3",  name:"Purchase Requests" },
          { id:"4.4",  name:"Purchase Orders" },
          { id:"4.5",  name:"Item Receipts" },
          { id:"4.6",  name:"Vendor Bills" },
          { id:"4.7",  name:"Vendor Bill Payments", children:[
            { id:"4.7.1", name:"ACH",        defaultWhenParentSelected:true },
            { id:"4.7.2", name:"Credit Card", defaultWhenParentSelected:true },
            { id:"4.7.3", name:"Cash",        defaultWhenParentSelected:true },
            { id:"4.7.4", name:"Check",       defaultWhenParentSelected:true }
          ]},
          { id:"4.8",  name:"3-Way Matching" },
          { id:"4.9",  name:"Vendor Quantity Pricing Schedules" },
          { id:"4.10", name:"Return to Debit", children:[
            { id:"4.10.1", name:"Return Authorizations", defaultWhenParentSelected:true },
            { id:"4.10.2", name:"Fulfillments",           defaultWhenParentSelected:true },
            { id:"4.10.3", name:"Credits",                defaultWhenParentSelected:true },
            { id:"4.10.4", name:"Refunds",                defaultWhenParentSelected:true }
          ]},
          { id:"4.11", name:"Expense Reporting", children:[
            { id:"4.11.1", name:"NetSuite Expense Management" },
            { id:"4.11.2", name:"Other", detail:"text", hint:"Specify expense platform" }
          ]},
          { id:"4.12", name:"Procurement Reports & KPI" },
          { id:"4.13", name:"Approval Workflows", children:[
            { id:"4.13.1", name:"Approval Workflow", detail:"text", hint:"Describe workflow" },
            { id:"4.13.2", name:"+ Add Approval Workflow", detail:"repeatable",
              repeatableFields:[{ name:"Approval Workflow", detail:"text", hint:"Describe workflow" }]
            }
          ]},
          { id:"4.14", name:"Inbound Shipments",      trigger:{ moduleGroupId:"advanced_inventory" } },
          { id:"4.15", name:"Landed Cost Allocations", trigger:{ moduleGroupId:"advanced_inventory" } }
        ]
      },

      // ── Module 5: Advanced Procurement ───────────────────
      {
        id: 5, name: "Advanced Procurement",
        trigger: { moduleGroupId:"advanced_procurement" },
        children: [
          { id:"5.1", name:"Requisitions" },
          { id:"5.2", name:"Blanket Purchase Orders" },
          { id:"5.3", name:"Purchase Contracts" },
          { id:"5.4", name:"Request for Quote" },
          { id:"5.5", name:"Vendor Management" },
          { id:"5.6", name:"Procurement Dashboard" }
        ]
      },

      // ── Module 6: Bill Capture ────────────────────────────
      {
        id: 6, name: "Bill Capture",
        trigger: { moduleGroupId:"bill_capture" },
        children: [
          { id:"6.1", name:"Invoice Scanning" },
          { id:"6.2", name:"Purchase Order Matching" },
          { id:"6.3", name:"Approval and Routing" }
        ]
      }
    ]
  },

  // ══════════════════════════════════════════════════════════
  {
    name: "Order to Cash",
    features: [

      // ── Module 7: Order Management ────────────────────────
      {
        id: 7, name: "Order Management",
        children: [
          { id:"7.1",  name:"Revenue Streams", children:[
            { id:"7.1.1", name:"Product Sales / Manufacturing" },
            { id:"7.1.2", name:"Wholesale Distribution" },
            { id:"7.1.3", name:"Professional Services" },
            { id:"7.1.4", name:"Other", detail:"text", hint:"Describe revenue stream" }
          ]},
          { id:"7.2",  name:"Customer Records" },
          { id:"7.3",  name:"Contact Records" },
          { id:"7.4",  name:"Customer Center", children:[
            { id:"7.4.1", name:"Standard" },
            { id:"7.4.2", name:"MyAccount" }
          ]},
          { id:"7.5",  name:"Partner Records" },
          { id:"7.6",  name:"Partner Center", children:[
            { id:"7.6.1", name:"Standard" },
            { id:"7.6.2", name:"Advanced" }
          ]},
          { id:"7.7",  name:"Sales Orders" },
          { id:"7.8",  name:"Sales Channels", children:[
            { id:"7.8.1", name:"Manual",       defaultWhenParentSelected:true },
            { id:"7.8.2", name:"Shopify" },
            { id:"7.8.3", name:"WooCommerce" },
            { id:"7.8.4", name:"EDI" },
            { id:"7.8.5", name:"Other", detail:"text", hint:"Specify channel" }
          ]},
          { id:"7.9",  name:"Customer Deposits" },
          { id:"7.10", name:"Order Fulfillments", children:[
            { id:"7.10.1", name:"Pick, Pack, Ship" },
            { id:"7.10.2", name:"Ship Central" },
            { id:"7.10.3", name:"Bill of Lading" },
            { id:"7.10.4", name:"Shipping Carriers Integration", detail:"list_ref", listRef:"shipping_carrier_list" }
          ]},
          { id:"7.11", name:"Invoices", children:[
            { id:"7.11.1", name:"Monthly Volume", detail:"number", hint:"Estimated monthly volume" }
          ]},
          { id:"7.12", name:"Delivery Method",   detail:"list_ref", listRef:"delivery_method_list" },
          { id:"7.13", name:"Customer Payments", detail:"list_ref", listRef:"customer_payments_list" },
          { id:"7.14", name:"Return to Credit", children:[
            { id:"7.14.1", name:"RMAs",         defaultWhenParentSelected:true },
            { id:"7.14.2", name:"Credit Memos", defaultWhenParentSelected:true },
            { id:"7.14.3", name:"Refunds",      defaultWhenParentSelected:true }
          ]},
          { id:"7.15", name:"Renewals", children:[
            { id:"7.15.1", name:"Inbound Orders from", detail:"text", hint:"Which system?" },
            { id:"7.15.2", name:"Evergreen" },
            { id:"7.15.3", name:"Billing Schedules" }
          ]},
          { id:"7.16", name:"Chargebacks and Deductions" },
          { id:"7.17", name:"Customer Rebates" },
          { id:"7.18", name:"Warranty Management" },
          { id:"7.19", name:"Order Management Reports & KPIs" },
          { id:"7.20", name:"Approval Workflows", children:[
            { id:"7.20.1", name:"Approval Workflow", detail:"text", hint:"Describe workflow" },
            { id:"7.20.2", name:"+ Add Approval Workflow", detail:"repeatable",
              repeatableFields:[{ name:"Approval Workflow", detail:"text", hint:"Describe workflow" }]
            }
          ]}
        ]
      },

      // ── Module 8: Revenue Recognition ────────────────────
      {
        id: 8, name: "Revenue Recognition",
        trigger: { moduleGroupId:"advanced_revenue_recognition" },
        children: [
          { id:"8.1", name:"Revenue Arrangements" },
          { id:"8.2", name:"Revenue Elements" },
          { id:"8.3", name:"Fair Value Consideration" }
        ]
      }
    ]
  },

  // ══════════════════════════════════════════════════════════
  {
    name: "Project to Cash",
    features: [
      {
        id: 9, name: "Project Management",
        children: [
          { id:"9.1", name:"Project Management" },
          { id:"9.2", name:"Resource Management" },
          { id:"9.3", name:"Project Templates" },
          { id:"9.4", name:"Time and Expense Management" },
          { id:"9.5", name:"Project Tasks" },
          { id:"9.6", name:"Billing Rules", children:[
            { id:"9.6.1", name:"Billing",            defaultWhenParentSelected:true },
            { id:"9.6.2", name:"Fixed Fee",           defaultWhenParentSelected:true },
            { id:"9.6.3", name:"T&M",                 defaultWhenParentSelected:true },
            { id:"9.6.4", name:"Milestone by Task",   defaultWhenParentSelected:true },
            { id:"9.6.5", name:"Percent to Complete", defaultWhenParentSelected:true }
          ]},
          { id:"9.7", name:"Project Revenue" },
          { id:"9.8", name:"Project Accounting" },
          { id:"9.9", name:"Project Reporting & KPIs" }
        ]
      }
    ]
  },

  // ══════════════════════════════════════════════════════════
  {
    name: "Lead to Quote",
    features: [
      {
        id: 10, name: "Lead to Quote",
        children: [
          { id:"10.1",  name:"Lead Records" },
          { id:"10.2",  name:"Online Lead Forms" },
          { id:"10.3",  name:"Prospect Records" },
          { id:"10.4",  name:"Opportunities" },
          { id:"10.5",  name:"Estimates" },
          { id:"10.6",  name:"Sales Forecasting" },
          { id:"10.7",  name:"Quota Management" },
          { id:"10.8",  name:"Upsell Manager" },
          { id:"10.9",  name:"Commission Reporting" },
          { id:"10.10", name:"Approval Workflows", children:[
            { id:"10.10.1", name:"Approval Workflow", detail:"text", hint:"Describe workflow" },
            { id:"10.10.2", name:"+ Add Approval Workflow", detail:"repeatable",
              repeatableFields:[{ name:"Approval Workflow", detail:"text", hint:"Describe workflow" }]
            }
          ]},
          { id:"10.11", name:"Pipeline Reporting & KPIs" }
        ]
      }
    ]
  },

  // ══════════════════════════════════════════════════════════
  {
    name: "Call to Resolution",
    features: [
      {
        id: 11, name: "Call to Resolution",
        children: [
          { id:"11.1", name:"Case Capture" },
          { id:"11.2", name:"Case Management" },
          { id:"11.3", name:"Routing & Escalations" },
          { id:"11.4", name:"Knowledge Base" },
          { id:"11.5", name:"Customer Service Reporting & KPIs" },
          { id:"11.6", name:"Approval Workflows", children:[
            { id:"11.6.1", name:"Approval Workflow", detail:"text", hint:"Describe workflow" },
            { id:"11.6.2", name:"+ Add Approval Workflow", detail:"repeatable",
              repeatableFields:[{ name:"Approval Workflow", detail:"text", hint:"Describe workflow" }]
            }
          ]}
        ]
      }
    ]
  },

  // ══════════════════════════════════════════════════════════
  {
    name: "Marketing to ROI",
    features: [
      {
        id: 12, name: "Marketing to ROI",
        children: [
          { id:"12.1", name:"Promotion Management" },
          { id:"12.2", name:"Marketing Campaign Records" },
          { id:"12.3", name:"Email Marketing Campaigns" },
          { id:"12.4", name:"Marketing ROI Reporting & KPIs" },
          { id:"12.5", name:"Approval Workflows", children:[
            { id:"12.5.1", name:"Approval Workflow", detail:"text", hint:"Describe workflow" },
            { id:"12.5.2", name:"+ Add Approval Workflow", detail:"repeatable",
              repeatableFields:[{ name:"Approval Workflow", detail:"text", hint:"Describe workflow" }]
            }
          ]}
        ]
      }
    ]
  },

  // ══════════════════════════════════════════════════════════
  {
    name: "Design to Build",
    features: [

      // ── Module 13: Inventory Management ──────────────────
      {
        id: 13, name: "Inventory Management",
        children: [
          { id:"13.1", name:"Item Master" },
          { id:"13.2", name:"Locations", detail:"number", hint:"Number of inventory locations" },
          { id:"13.3", name:"Item Types", children:[
            { id:"13.3.1", name:"Inventory",    defaultWhenParentSelected:true },
            { id:"13.3.2", name:"Kits / Groups", defaultWhenParentSelected:true },
            { id:"13.3.3", name:"Matrix",        defaultWhenParentSelected:true },
            { id:"13.3.4", name:"Service Items", defaultWhenParentSelected:true },
            { id:"13.3.5", name:"Other Charge",  defaultWhenParentSelected:true }
          ]},
          { id:"13.4", name:"Item Pricing", children:[
            { id:"13.4.1", name:"Price Levels" },
            { id:"13.4.2", name:"Other", detail:"text", hint:"Describe pricing method" }
          ]},
          { id:"13.5", name:"Inventory Costing", detail:"list_ref", listRef:"inventory_costing_list" },
          { id:"13.6", name:"Inventory Management & Control", children:[
            { id:"13.6.1", name:"Counts",                                  defaultWhenParentSelected:true },
            { id:"13.6.2", name:"Adjustments",                             defaultWhenParentSelected:true },
            { id:"13.6.3", name:"Transfer Orders",                         defaultWhenParentSelected:true },
            { id:"13.6.4", name:"Reorder Points & Preferred Stock Levels", defaultWhenParentSelected:true },
            { id:"13.6.5", name:"Safety Stock Levels",                     defaultWhenParentSelected:true }
          ]},
          { id:"13.7", name:"Inventory Management Reports & KPIs" },
          { id:"13.8", name:"Approval Workflows", children:[
            { id:"13.8.1", name:"Approval Workflow", detail:"text", hint:"Describe workflow" },
            { id:"13.8.2", name:"+ Add Approval Workflow", detail:"repeatable",
              repeatableFields:[{ name:"Approval Workflow", detail:"text", hint:"Describe workflow" }]
            }
          ]},
          { id:"13.9",  name:"Lot / Serial Tracking",    trigger:{ moduleGroupId:"advanced_inventory" } },
          { id:"13.10", name:"Bins",                      trigger:{ moduleGroupId:"advanced_inventory" } },
          { id:"13.11", name:"Multiple Units of Measure", trigger:{ moduleGroupId:"advanced_inventory" } }
        ]
      },

      // ── Module 14: Material Requirements Planning ─────────
      {
        id: 14, name: "Material Requirements Planning",
        trigger: { moduleGroupId:"advanced_demand_planning" },
        children: [
          { id:"14.1", name:"Demand Plans", detail:"list_ref", listRef:"demand_plans_list" },
          { id:"14.2", name:"Supply Plan Definitions" },
          { id:"14.3", name:"Item Planning Groups" },
          { id:"14.4", name:"Distribution Strategies" },
          { id:"14.5", name:"Planning Workbench" }
        ]
      },

      // ── Module 15: Smart Count ────────────────────────────
      {
        id: 15, name: "Smart Count",
        trigger: { moduleGroupId:"smart_count" },
        children: [
          { id:"15.1", name:"Directed Counts" },
          { id:"15.2", name:"Spot Counts" },
          { id:"15.3", name:"Tolerance Thresholds & Approvals" },
          { id:"15.4", name:"Smart Count Dashboard" }
        ]
      }
    ]
  },

  // ══════════════════════════════════════════════════════════
  {
    name: "Plan to Produce",
    features: [

      // ── Module 16: Work Orders & Assemblies ───────────────
      {
        id: 16, name: "Work Orders & Assemblies",
        children: [
          { id:"16.1", name:"Assembly Items" },
          { id:"16.2", name:"Bills of Material & Revisions" },
          { id:"16.3", name:"Printed BOMs / Work Orders" },
          { id:"16.4", name:"Work Orders" },
          { id:"16.5", name:"Assembly Builds" },
          { id:"16.6", name:"Manufacturing Mobile" },
          { id:"16.7", name:"Manufacturing Reports & KPIs" },
          { id:"16.8", name:"Approval Workflows", children:[
            { id:"16.8.1", name:"Approval Workflow", detail:"text", hint:"Describe workflow" },
            { id:"16.8.2", name:"+ Add Approval Workflow", detail:"repeatable",
              repeatableFields:[{ name:"Approval Workflow", detail:"text", hint:"Describe workflow" }]
            }
          ]}
        ]
      },

      // ── Module 17: WIP & Routings ─────────────────────────
      {
        id: 17, name: "WIP & Routings",
        children: [
          { id:"17.1",  name:"Routing Records & Operations" },
          { id:"17.2",  name:"Work Order Travelers" },
          { id:"17.3",  name:"Work Instructions" },
          { id:"17.4",  name:"Work Centers" },
          { id:"17.5",  name:"Manufacturing Cost Templates" },
          { id:"17.6",  name:"Costing Methods", children:[
            { id:"17.6.1", name:"Average" },
            { id:"17.6.2", name:"Standard" }
          ]},
          { id:"17.7",  name:"Material Issuance to WIP" },
          { id:"17.8",  name:"Work Order Operation Completions" },
          { id:"17.9",  name:"Work Order Close" },
          { id:"17.10", name:"Manufacturing Task Scheduler" },
          { id:"17.11", name:"Manufacturing Reports & KPIs" }
        ]
      }
    ]
  },

  // ══════════════════════════════════════════════════════════
  {
    name: "Warehouse Management System",
    features: [
      {
        id: 18, name: "Warehouse Management",
        children: [
          { id:"18.1", name:"Warehouse Activity Dashboards" },
          { id:"18.2", name:"Locations, Zones, Bins" },
          { id:"18.3", name:"Mobile Capabilities", children:[
            { id:"18.3.1", name:"Barcode Scanning", defaultWhenParentSelected:true },
            { id:"18.3.2", name:"Fulfillment",       defaultWhenParentSelected:true },
            { id:"18.3.3", name:"Receiving",         defaultWhenParentSelected:true },
            { id:"18.3.4", name:"Transfers",         defaultWhenParentSelected:true },
            { id:"18.3.5", name:"Cycle Counts",      defaultWhenParentSelected:true }
          ]},
          { id:"18.4", name:"Wave Picking", children:[
            { id:"18.4.1", name:"Single and Multi-Order Picking", defaultWhenParentSelected:true },
            { id:"18.4.2", name:"Scheduled Releases",             defaultWhenParentSelected:true }
          ]},
          { id:"18.5", name:"Warehouse Intelligence", children:[
            { id:"18.5.1", name:"Put-away Strategies", defaultWhenParentSelected:true },
            { id:"18.5.2", name:"Picking Strategies",  defaultWhenParentSelected:true }
          ]},
          { id:"18.6", name:"Barcode Labeling", children:[
            { id:"18.6.1", name:"Composite (Linear 1D) and Data Matrix (2D)",                  defaultWhenParentSelected:true },
            { id:"18.6.2", name:"GS1 - GS1-128 (1D) and GS1 DataMatrix (2D), GTIN-14 (01)",  defaultWhenParentSelected:true },
            { id:"18.6.3", name:"Health Industry Bar Code (HIBC) - Code 128 and Data Matrix",  defaultWhenParentSelected:true }
          ]},
          { id:"18.7", name:"Warehouse Management Reports & Analytics" }
        ]
      }
    ]
  },

  // ══════════════════════════════════════════════════════════
  {
    name: "NS Planning & Budgeting",
    features: [
      {
        id: 19, name: "NS Planning & Budgeting",
        children: [
          { id:"19.1",  name:"Budgeting", children:[
            { id:"19.1.1", name:"Annual or Multi-Year Budget", defaultWhenParentSelected:true },
            { id:"19.1.2", name:"Number of Years", detail:"number",   hint:"How many years?" },
            { id:"19.1.3", name:"Currency",        detail:"list_ref", listRef:"currency_list" }
          ]},
          { id:"19.2",  name:"Forecasting / Re-forecasting", detail:"list_ref", listRef:"forecasting_list" },
          { id:"19.3",  name:"Planning Segments / Dimensions", children:[
            { id:"19.3.1",  name:"COA",                            defaultWhenParentSelected:true },
            { id:"19.3.2",  name:"Subsidiary",                     defaultWhenParentSelected:true },
            { id:"19.3.3",  name:"Department",                     defaultWhenParentSelected:true },
            { id:"19.3.4",  name:"Location",                       defaultWhenParentSelected:true },
            { id:"19.3.5",  name:"Class",                          defaultWhenParentSelected:true },
            { id:"19.3.6",  name:"Item",                           defaultWhenParentSelected:true },
            { id:"19.3.7",  name:"Relationship (Customer/Vendor)", defaultWhenParentSelected:true },
            { id:"19.3.8",  name:"12-Month Period",                defaultWhenParentSelected:true },
            { id:"19.3.9",  name:"Project",                        defaultWhenParentSelected:true },
            { id:"19.3.10", name:"Employee",                       defaultWhenParentSelected:true }
          ]},
          { id:"19.4",  name:"Alternate Hierarchies / Attributes", children:[
            { id:"19.4.1", name:"Management Account Grouping", defaultWhenParentSelected:true },
            { id:"19.4.2", name:"Region",                      defaultWhenParentSelected:true },
            { id:"19.4.3", name:"Sales Rep",                   defaultWhenParentSelected:true },
            { id:"19.4.4", name:"Categories",                  defaultWhenParentSelected:true }
          ]},
          { id:"19.5",  name:"Revenue / Cost of Revenue Planning", children:[
            { id:"19.5.1", name:"Standard-As-Delivered Setup and Calculations", defaultWhenParentSelected:true },
            { id:"19.5.2", name:"SaaS Subscription",                            defaultWhenParentSelected:true },
            { id:"19.5.3", name:"Professional Services",                        defaultWhenParentSelected:true }
          ]},
          { id:"19.6",  name:"OpEx Planning", children:[
            { id:"19.6.1", name:"Standard-As-Delivered Setup and Calculations", defaultWhenParentSelected:true }
          ]},
          { id:"19.7",  name:"CapEx Planning", children:[
            { id:"19.7.1", name:"Standard-As-Delivered Setup and Calculations", defaultWhenParentSelected:true }
          ]},
          { id:"19.8",  name:"Workforce Planning", children:[
            { id:"19.8.1", name:"Standard-As-Delivered Setup and Calculations",        defaultWhenParentSelected:true },
            { id:"19.8.2", name:"By Employee — Salaried/Hourly, Yearly Raise, Bonus", defaultWhenParentSelected:true },
            { id:"19.8.3", name:"401k, Medical, Dental, Vision, Payroll Taxes",        defaultWhenParentSelected:true },
            { id:"19.8.4", name:"Allocation by Department",                            defaultWhenParentSelected:true }
          ]},
          { id:"19.9",  name:"Indirect Allocation", children:[
            { id:"19.9.1", name:"Standard-As-Delivered Setup and Calculations", defaultWhenParentSelected:true }
          ]},
          { id:"19.10", name:"Accounting Periods" },
          { id:"19.11", name:"Balance Sheet / Cash Flow Planning", children:[
            { id:"19.11.1", name:"Standard-As-Delivered Setup and Calculations",       defaultWhenParentSelected:true },
            { id:"19.11.2", name:"Bank Account Reconciliation, Transfers and Deposits", defaultWhenParentSelected:true }
          ]},
          { id:"19.12", name:"Financial Reporting", children:[
            { id:"19.12.1", name:"Standard-As-Delivered", defaultWhenParentSelected:true },
            { id:"19.12.2", name:"Tailored Reports",       defaultWhenParentSelected:true },
            { id:"19.12.3", name:"Financial Reports",      defaultWhenParentSelected:true }
          ]}
        ]
      }
    ]
  },

  // ══════════════════════════════════════════════════════════
  {
    name: "NSAW",
    features: [
      {
        id: 20, name: "NSAW",
        children: [
          { id:"20.1", name:"NS to NSAW Data Flow", children:[
            { id:"20.1.1",  name:"Financials",                      defaultWhenParentSelected:true },
            { id:"20.1.2",  name:"Sales",                           defaultWhenParentSelected:true },
            { id:"20.1.3",  name:"Purchases & Payables",            defaultWhenParentSelected:true },
            { id:"20.1.4",  name:"Projects and Support Management", defaultWhenParentSelected:true },
            { id:"20.1.5",  name:"Sales Snapshots",                 defaultWhenParentSelected:true },
            { id:"20.1.6",  name:"Bank",                            defaultWhenParentSelected:true },
            { id:"20.1.7",  name:"Inventory",                       defaultWhenParentSelected:true },
            { id:"20.1.8",  name:"Manufacturing",                   defaultWhenParentSelected:true },
            { id:"20.1.9",  name:"Inventory Snapshot",              defaultWhenParentSelected:true },
            { id:"20.1.10", name:"Payroll",                         defaultWhenParentSelected:true },
            { id:"20.1.11", name:"Employee Expenses",               defaultWhenParentSelected:true }
          ]},
          { id:"20.2", name:"Other Systems to NSAW", children:[
            { id:"20.2.1", name:"Other Financial and Statistical Data", detail:"text", hint:"Describe data source" }
          ]}
        ]
      }
    ]
  },

  // ══════════════════════════════════════════════════════════
  {
    name: "NSAR",
    features: [
      {
        id: 21, name: "NSAR",
        children: [
          { id:"21.1", name:"Reconciliation Compliance", children:[
            { id:"21.1.1", name:"Balance Sheet Reconciliations",    defaultWhenParentSelected:true },
            { id:"21.1.2", name:"Variance Analysis for B/S and P&L", defaultWhenParentSelected:true }
          ]},
          { id:"21.2", name:"Transaction Matching", children:[
            { id:"21.2.1", name:"Bank",               defaultWhenParentSelected:true },
            { id:"21.2.2", name:"Intercompany",        defaultWhenParentSelected:true },
            { id:"21.2.3", name:"Suspense & Clearing", defaultWhenParentSelected:true },
            { id:"21.2.4", name:"Lockbox",             defaultWhenParentSelected:true },
            { id:"21.2.5", name:"A/P, A/R",            defaultWhenParentSelected:true },
            { id:"21.2.6", name:"Credit Cards",        defaultWhenParentSelected:true }
          ]},
          { id:"21.3", name:"NS to NSAR Data Flow", children:[
            { id:"21.3.1", name:"G/L Balances",                               defaultWhenParentSelected:true },
            { id:"21.3.2", name:"Transaction Balances",                       defaultWhenParentSelected:true },
            { id:"21.3.3", name:"Currency Exchange Rates",                    defaultWhenParentSelected:true },
            { id:"21.3.4", name:"Transaction and Base Currency G/L Balance",  defaultWhenParentSelected:true },
            { id:"21.3.5", name:"Metadata (Subsidiary, Accounts)",            defaultWhenParentSelected:true }
          ]}
        ]
      }
    ]
  },

  // ══════════════════════════════════════════════════════════
  {
    name: "Field Service Management",
    features: [

      // ── Module 22: Field Service Management ──────────────
      {
        id: 22, name: "Field Service Management",
        children: [
          { id:"22.1",  name:"Base FSM Deployment", children:[
            { id:"22.1.1", name:"Process Flow Documentation",             defaultWhenParentSelected:true },
            { id:"22.1.2", name:"Installation Use Case",                  defaultWhenParentSelected:true },
            { id:"22.1.3", name:"Maintenance Use Case",                   defaultWhenParentSelected:true },
            { id:"22.1.4", name:"Break Fix and Inspect and Fix Use Case", defaultWhenParentSelected:true }
          ]},
          { id:"22.2",  name:"Field Technician Mobile Screens" },
          { id:"22.3",  name:"Guided Checklists" },
          { id:"22.4",  name:"Capture of Expenses, Material Usage, Time and Other Inputs" },
          { id:"22.5",  name:"Barcode Scanning and Photo Capturing" },
          { id:"22.6",  name:"Device Tracking" },
          { id:"22.7",  name:"Create Child Assets in the Field" },
          { id:"22.8",  name:"Create Grandchild Assets in the Field" },
          { id:"22.9",  name:"Team Member Times & Expenses" },
          { id:"22.10", name:"Team Member Mobile View" },
          { id:"22.11", name:"Language Translation", detail:"list_ref", listRef:"languages_list" },
          { id:"22.12", name:"Service Report", children:[
            { id:"22.12.1", name:"Language Translation", detail:"list_ref", listRef:"languages_list" }
          ]},
          { id:"22.13", name:"Project Tasks" },
          { id:"22.14", name:"Additional Use Case: Inspection and Fix: 3-Tier Assets" },
          { id:"22.15", name:"Block Team Members from Completing Tasks" },
          { id:"22.16", name:"Stock / Inventory Lookup Tab" },
          { id:"22.17", name:"Data Migration — Assets Only" },
          { id:"22.18", name:"Post-Launch Support", children:[
            { id:"22.18.1", name:"Number of Hours", detail:"number", hint:"Hours of post-launch support" }
          ]}
        ]
      },

      // ── Module 23: FSM Other Considerations ───────────────
      {
        id: 23, name: "FSM Other Considerations",
        children: [
          { id:"23.1",  name:"Facilities Contracts" },
          { id:"23.2",  name:"Admin Task" },
          { id:"23.3",  name:"Additional PM Types" },
          { id:"23.4",  name:"NextService Asset: Third Tier on Mobile w/ Checklist" },
          { id:"23.5",  name:"Fixed Asset (FAM) to NextService Asset Link" },
          { id:"23.6",  name:"Plants Considered in Scope", children:[
            { id:"23.6.1", name:"Number of Plants", detail:"number", hint:"Number of plants in scope" }
          ]},
          { id:"23.7",  name:"All Asset Maintenance and Service Procedures On-Site (Within 4 Walls)" },
          { id:"23.8",  name:"Up to 10 Mobile Checklists in Configuration (up to 30 fields each)" },
          { id:"23.9",  name:"Mobile Language Translation (Spanish & Italian) Considered in Scope" },
          { id:"23.10", name:"Train the Trainer Approach (7 Key Users, 1 per Site)" },
          { id:"23.11", name:"Post-Launch Support Included in Service Fees",
            detail:"number", hint:"Months of support", defaultDetail:"1" },
          { id:"23.12", name:"On-Site Visits (Design Workshop, User Training, Go Live)", children:[
            { id:"23.12.1", name:"Number of Visits", detail:"number", hint:"Number of visits", defaultDetail:"1" }
          ]}
        ]
      }
    ]
  },

  // ══════════════════════════════════════════════════════════
  {
    name: "Integrations",
    features: [
      { id:24, name:"Banking Integration", children:[
        { id:"24.1", name:"Bank",     detail:"list_ref", listRef:"bank_list" },
        { id:"24.2", name:"Inbound — Bank Statement Import" },
        { id:"24.3", name:"Outbound — Payment Files (ACH, Wire)" },
        { id:"24.4", name:"+ Add Data Flow", defaultWhenParentSelected:true, detail:"repeatable",
          repeatableFields:[{ name:"Data Flow", detail:"text", hint:"Describe data flow (e.g. Inbound — ACH Files)" }] },
        { id:"24.5", name:"Platform", defaultWhenParentSelected:true, detail:"list_ref", listRef:"integration_platform" }
      ]},
      { id:25, name:"Credit Card Integration", children:[
        { id:"25.1", name:"Credit Card", detail:"list_ref", listRef:"creditcard_list" },
        { id:"25.2", name:"Inbound — Credit Card Statement" },
        { id:"25.3", name:"+ Add Data Flow", defaultWhenParentSelected:true, detail:"repeatable",
          repeatableFields:[{ name:"Data Flow", detail:"text", hint:"Describe data flow" }] },
        { id:"25.4", name:"Platform", defaultWhenParentSelected:true, detail:"list_ref", listRef:"integration_platform" }
      ]},
      { id:26, name:"Payroll Integration", children:[
        { id:"26.1", name:"Existing Solution", detail:"list_ref", listRef:"expensereporting_list" },
        { id:"26.2", name:"Inbound — Employees, Payroll JE" },
        { id:"26.3", name:"+ Add Data Flow", defaultWhenParentSelected:true, detail:"repeatable",
          repeatableFields:[{ name:"Data Flow", detail:"text", hint:"Describe data flow" }] },
        { id:"26.4", name:"Platform", defaultWhenParentSelected:true, detail:"list_ref", listRef:"integration_platform" }
      ]},
      { id:27, name:"Expense Reporting Integration", children:[
        { id:"27.1", name:"Existing Solution", detail:"list_ref", listRef:"expensereporting_list" },
        { id:"27.2", name:"Inbound — Expense Report Data as Supported by SuiteApp" },
        { id:"27.3", name:"Outbound — Accounting Configurations" },
        { id:"27.4", name:"+ Add Data Flow", defaultWhenParentSelected:true, detail:"repeatable",
          repeatableFields:[{ name:"Data Flow", detail:"text", hint:"Describe data flow" }] },
        { id:"27.5", name:"Platform", defaultWhenParentSelected:true, detail:"list_ref", listRef:"integration_platform" }
      ]},
      { id:28, name:"Bill Pay Integration", children:[
        { id:"28.1", name:"Existing Solution", detail:"list_ref", listRef:"billpay_list" },
        { id:"28.2", name:"Inbound — Vendor Bills, Vendor Payments" },
        { id:"28.3", name:"Outbound — Accounting Configurations" },
        { id:"28.4", name:"+ Add Data Flow", defaultWhenParentSelected:true, detail:"repeatable",
          repeatableFields:[{ name:"Data Flow", detail:"text", hint:"Describe data flow" }] },
        { id:"28.5", name:"Platform", defaultWhenParentSelected:true, detail:"list_ref", listRef:"integration_platform" }
      ]},
      { id:29, name:"Tax Integration", children:[
        { id:"29.1", name:"Existing Solution", detail:"list_ref", listRef:"taxsolution_list" },
        { id:"29.2", name:"Inbound — Tax Codes, Rates" },
        { id:"29.3", name:"Outbound — Tax Calculations" },
        { id:"29.4", name:"+ Add Data Flow", defaultWhenParentSelected:true, detail:"repeatable",
          repeatableFields:[{ name:"Data Flow", detail:"text", hint:"Describe data flow" }] },
        { id:"29.5", name:"Platform", defaultWhenParentSelected:true, detail:"list_ref", listRef:"integration_platform" }
      ]},
      { id:30, name:"Time Entry Integration", children:[
        { id:"30.1", name:"Existing Solution", detail:"list_ref", listRef:"timeentry_list" },
        { id:"30.2", name:"Inbound — Time Entries" },
        { id:"30.3", name:"+ Add Data Flow", defaultWhenParentSelected:true, detail:"repeatable",
          repeatableFields:[{ name:"Data Flow", detail:"text", hint:"Describe data flow" }] },
        { id:"30.4", name:"Platform", defaultWhenParentSelected:true, detail:"list_ref", listRef:"integration_platform" }
      ]},
      { id:31, name:"CRM Integration", children:[
        { id:"31.1", name:"Existing Solution", detail:"list_ref", listRef:"crm_list" },
        { id:"31.2", name:"Inbound — Customers, Orders, Projects" },
        { id:"31.3", name:"Outbound — Customer Financial Data" },
        { id:"31.4", name:"+ Add Data Flow", defaultWhenParentSelected:true, detail:"repeatable",
          repeatableFields:[{ name:"Data Flow", detail:"text", hint:"Describe data flow" }] },
        { id:"31.5", name:"Platform", defaultWhenParentSelected:true, detail:"list_ref", listRef:"integration_platform" }
      ]},
      { id:32, name:"Accounting Information Integration", children:[
        { id:"32.1", name:"Existing Solution", detail:"list_ref", listRef:"accountinginfo_list" },
        { id:"32.2", name:"Inbound — Period Close" },
        { id:"32.3", name:"Outbound — Accounting Transactions" },
        { id:"32.4", name:"+ Add Data Flow", defaultWhenParentSelected:true, detail:"repeatable",
          repeatableFields:[{ name:"Data Flow", detail:"text", hint:"Describe data flow" }] },
        { id:"32.5", name:"Platform", defaultWhenParentSelected:true, detail:"list_ref", listRef:"integration_platform" }
      ]},
      { id:33, name:"Payment Gateway Integration", children:[
        { id:"33.1", name:"Existing Solution", detail:"list_ref", listRef:"paymentgateway_list" },
        { id:"33.2", name:"Inbound — Customer Payments, Customer Refunds, Invoices" },
        { id:"33.3", name:"Outbound — Accounting Configurations, Invoices, Credit Memos" },
        { id:"33.4", name:"+ Add Data Flow", defaultWhenParentSelected:true, detail:"repeatable",
          repeatableFields:[{ name:"Data Flow", detail:"text", hint:"Describe data flow" }] },
        { id:"33.5", name:"Platform", defaultWhenParentSelected:true, detail:"list_ref", listRef:"integration_platform" }
      ]},
      { id:34, name:"FP&A Integration", children:[
        { id:"34.1", name:"Existing Solution", detail:"list_ref", listRef:"fpa_list" },
        { id:"34.2", name:"Outbound — Financial Transactions, Accounting Configurations" },
        { id:"34.3", name:"+ Add Data Flow", defaultWhenParentSelected:true, detail:"repeatable",
          repeatableFields:[{ name:"Data Flow", detail:"text", hint:"Describe data flow" }] },
        { id:"34.4", name:"Platform", defaultWhenParentSelected:true, detail:"list_ref", listRef:"integration_platform" }
      ]},
      { id:35, name:"EDI Integration", children:[
        { id:"35.1", name:"Existing Solution", detail:"list_ref", listRef:"edi_list" },
        { id:"35.2", name:"Inbound — Sales Orders" },
        { id:"35.3", name:"Outbound — ASNs, Customer Invoices" },
        { id:"35.4", name:"+ Add Data Flow", defaultWhenParentSelected:true, detail:"repeatable",
          repeatableFields:[{ name:"Data Flow", detail:"text", hint:"Describe data flow" }] },
        { id:"35.5", name:"Platform", defaultWhenParentSelected:true, detail:"list_ref", listRef:"integration_platform" }
      ]},
      { id:36, name:"eCommerce Integration", children:[
        { id:"36.1", name:"Existing Solution", detail:"list_ref", listRef:"ecommerce_list" },
        { id:"36.2", name:"Inbound — Customers, Sales Orders, Customer Payments" },
        { id:"36.3", name:"Outbound — Items, Inventory Values, Fulfillments" },
        { id:"36.4", name:"+ Add Data Flow", defaultWhenParentSelected:true, detail:"repeatable",
          repeatableFields:[{ name:"Data Flow", detail:"text", hint:"Describe data flow" }] },
        { id:"36.5", name:"Platform", defaultWhenParentSelected:true, detail:"list_ref", listRef:"integration_platform" }
      ]},
      { id:37, name:"DataWarehouse Integration", children:[
        { id:"37.1", name:"Existing Solution", detail:"list_ref", listRef:"datawarehouse_list" },
        { id:"37.2", name:"Outbound — Financial Transactions, Accounting Configurations" },
        { id:"37.3", name:"+ Add Data Flow", defaultWhenParentSelected:true, detail:"repeatable",
          repeatableFields:[{ name:"Data Flow", detail:"text", hint:"Describe data flow" }] },
        { id:"37.4", name:"Platform", defaultWhenParentSelected:true, detail:"list_ref", listRef:"integration_platform" }
      ]}
    ]
  },

  // ══════════════════════════════════════════════════════════
  {
    name: "Customizations",
    features: [
      {
        id: 38, name: "Customizations",
        children: [
          { id:"38.1", name:"Workflows & Scripts", children:[
            { id:"38.1.1", name:"Warehouse Activity Dashboards",                 defaultWhenParentSelected:true },
            { id:"38.1.2", name:"Expiration and Shelf-Life Tracking",            defaultWhenParentSelected:true },
            { id:"38.1.3", name:"Barcode Labeling",                              defaultWhenParentSelected:true },
            { id:"38.1.4", name:"Barcode Scanning",                              defaultWhenParentSelected:true },
            { id:"38.1.5", name:"Single and Multi-Order Picking",                defaultWhenParentSelected:true },
            { id:"38.1.6", name:"Paperless System Directed Putaway and Picking", defaultWhenParentSelected:true },
            { id:"38.1.7", name:"Packlist Printing",                             defaultWhenParentSelected:true },
            { id:"38.1.8", name:"Shipping Integration with UPS/FedEx/USPS",     defaultWhenParentSelected:true },
            { id:"38.1.9", name:"Composite Barcodes: GS1 Label",                defaultWhenParentSelected:true }
          ]}
        ]
      }
    ]
  }

];
