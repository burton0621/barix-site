/**
 * Pre-built service templates organized by trade/business type.
 * These are starter services that contractors can quickly add to their catalog.
 * 
 * Each service includes:
 * - name: Service name
 * - default_rate: Suggested rate (contractor can modify)
 * - description: Description shown on invoices
 */

export const SERVICE_TEMPLATES = {
  "HVAC": [
    { name: "AC Tune-Up", default_rate: 89, description: "Complete air conditioning system inspection and maintenance" },
    { name: "Furnace Tune-Up", default_rate: 89, description: "Complete furnace inspection and maintenance" },
    { name: "AC Repair", default_rate: 150, description: "Diagnostic and repair of air conditioning system" },
    { name: "Furnace Repair", default_rate: 150, description: "Diagnostic and repair of heating system" },
    { name: "Thermostat Installation", default_rate: 175, description: "Installation and programming of new thermostat" },
    { name: "Duct Cleaning", default_rate: 299, description: "Complete air duct cleaning and sanitization" },
    { name: "AC Installation", default_rate: 3500, description: "Installation of new air conditioning unit" },
    { name: "Furnace Installation", default_rate: 3000, description: "Installation of new furnace" },
    { name: "Refrigerant Recharge", default_rate: 200, description: "AC refrigerant top-off and leak inspection" },
    { name: "Service Call / Diagnostic", default_rate: 89, description: "On-site diagnostic and troubleshooting" },
  ],
  
  "Plumbing": [
    { name: "Drain Cleaning", default_rate: 150, description: "Professional drain clearing and cleaning" },
    { name: "Leak Repair", default_rate: 175, description: "Locate and repair water leak" },
    { name: "Faucet Installation", default_rate: 125, description: "Installation of new faucet" },
    { name: "Toilet Repair", default_rate: 125, description: "Toilet repair or parts replacement" },
    { name: "Toilet Installation", default_rate: 225, description: "Installation of new toilet" },
    { name: "Water Heater Repair", default_rate: 200, description: "Water heater diagnostic and repair" },
    { name: "Water Heater Installation", default_rate: 1200, description: "Installation of new water heater including removal of old unit" },
    { name: "Garbage Disposal Installation", default_rate: 175, description: "Installation of new garbage disposal" },
    { name: "Pipe Repair", default_rate: 250, description: "Repair or replace damaged pipe section" },
    { name: "Service Call / Diagnostic", default_rate: 89, description: "On-site diagnostic and troubleshooting" },
  ],
  
  "Electrical": [
    { name: "Outlet Installation", default_rate: 150, description: "Installation of new electrical outlet" },
    { name: "Outlet Repair", default_rate: 100, description: "Repair or replace faulty outlet" },
    { name: "Light Fixture Installation", default_rate: 125, description: "Installation of new light fixture" },
    { name: "Ceiling Fan Installation", default_rate: 175, description: "Installation of ceiling fan" },
    { name: "Switch Installation", default_rate: 100, description: "Installation of new light switch" },
    { name: "Dimmer Switch Installation", default_rate: 125, description: "Installation of dimmer switch" },
    { name: "Panel Upgrade", default_rate: 2500, description: "Electrical panel upgrade" },
    { name: "Circuit Breaker Replacement", default_rate: 200, description: "Replace faulty circuit breaker" },
    { name: "Whole House Surge Protector", default_rate: 350, description: "Installation of whole house surge protection" },
    { name: "Service Call / Diagnostic", default_rate: 89, description: "On-site electrical diagnostic" },
  ],
  
  "Lawn Care": [
    { name: "Lawn Mowing", default_rate: 45, description: "Standard lawn mowing service" },
    { name: "Lawn Mowing (Large)", default_rate: 75, description: "Lawn mowing for large properties" },
    { name: "Edging & Trimming", default_rate: 35, description: "Edging and string trimmer work" },
    { name: "Leaf Removal", default_rate: 150, description: "Full property leaf cleanup and removal" },
    { name: "Mulch Installation", default_rate: 75, description: "Mulch installation per cubic yard" },
    { name: "Fertilizer Application", default_rate: 65, description: "Lawn fertilizer application" },
    { name: "Weed Control", default_rate: 55, description: "Weed treatment and control" },
    { name: "Aeration", default_rate: 125, description: "Lawn aeration service" },
    { name: "Overseeding", default_rate: 100, description: "Lawn overseeding service" },
    { name: "Spring/Fall Cleanup", default_rate: 200, description: "Seasonal cleanup service" },
  ],
  
  "Roofing": [
    { name: "Roof Inspection", default_rate: 150, description: "Complete roof inspection and assessment" },
    { name: "Shingle Repair", default_rate: 300, description: "Repair damaged or missing shingles" },
    { name: "Leak Repair", default_rate: 400, description: "Locate and repair roof leak" },
    { name: "Flashing Repair", default_rate: 250, description: "Repair or replace roof flashing" },
    { name: "Gutter Cleaning", default_rate: 150, description: "Clean gutters and downspouts" },
    { name: "Gutter Installation", default_rate: 12, description: "Gutter installation per linear foot" },
    { name: "Roof Replacement", default_rate: 8000, description: "Complete roof replacement" },
    { name: "Soffit & Fascia Repair", default_rate: 350, description: "Repair soffit and fascia" },
    { name: "Skylight Installation", default_rate: 1500, description: "Skylight installation" },
    { name: "Emergency Tarp", default_rate: 500, description: "Emergency roof tarping" },
  ],
  
  "Painting": [
    { name: "Interior Room (Small)", default_rate: 300, description: "Paint small room (bathroom, closet)" },
    { name: "Interior Room (Standard)", default_rate: 450, description: "Paint standard room" },
    { name: "Interior Room (Large)", default_rate: 600, description: "Paint large room or open space" },
    { name: "Exterior Painting", default_rate: 3500, description: "Exterior house painting" },
    { name: "Cabinet Painting", default_rate: 1500, description: "Kitchen cabinet painting" },
    { name: "Deck Staining", default_rate: 800, description: "Deck staining and sealing" },
    { name: "Fence Staining", default_rate: 600, description: "Fence staining and sealing" },
    { name: "Drywall Repair", default_rate: 150, description: "Patch and repair drywall" },
    { name: "Trim Painting", default_rate: 200, description: "Paint doors, trim, and molding" },
    { name: "Pressure Washing", default_rate: 250, description: "Pressure washing service" },
  ],
  
  "Carpentry": [
    { name: "Door Installation", default_rate: 250, description: "Interior door installation" },
    { name: "Exterior Door Installation", default_rate: 450, description: "Exterior door installation" },
    { name: "Window Installation", default_rate: 400, description: "Window installation" },
    { name: "Trim Installation", default_rate: 200, description: "Baseboard and trim installation" },
    { name: "Crown Molding", default_rate: 15, description: "Crown molding per linear foot" },
    { name: "Deck Building", default_rate: 5000, description: "Custom deck construction" },
    { name: "Fence Installation", default_rate: 3000, description: "Privacy fence installation" },
    { name: "Shelving Installation", default_rate: 200, description: "Custom shelving installation" },
    { name: "Cabinet Installation", default_rate: 150, description: "Cabinet installation per cabinet" },
    { name: "General Repairs", default_rate: 85, description: "General carpentry repair work per hour" },
  ],
  
  "General Contracting": [
    { name: "Project Consultation", default_rate: 150, description: "On-site project consultation and estimate" },
    { name: "Demolition", default_rate: 500, description: "Demolition and debris removal" },
    { name: "Drywall Installation", default_rate: 3, description: "Drywall installation per sq ft" },
    { name: "Flooring Installation", default_rate: 5, description: "Flooring installation per sq ft" },
    { name: "Tile Installation", default_rate: 12, description: "Tile installation per sq ft" },
    { name: "Kitchen Remodel", default_rate: 15000, description: "Kitchen remodeling project" },
    { name: "Bathroom Remodel", default_rate: 8000, description: "Bathroom remodeling project" },
    { name: "Basement Finishing", default_rate: 25000, description: "Basement finishing project" },
    { name: "Permit Fees", default_rate: 500, description: "Building permit acquisition" },
    { name: "Project Management", default_rate: 100, description: "Project management per hour" },
  ],
};

// List of available trades (matches what's in ProfileClient.js)
export const AVAILABLE_TRADES = [
  "HVAC",
  "Lawn Care", 
  "Plumbing",
  "Roofing",
  "Painting",
  "Carpentry",
  "Electrical",
  "General Contracting",
];

// Trade icons for visual display
export const TRADE_ICONS = {
  "HVAC": "❄️",
  "Lawn Care": "🌿",
  "Plumbing": "🔧",
  "Roofing": "🏠",
  "Painting": "🎨",
  "Carpentry": "🔨",
  "Electrical": "⚡",
  "General Contracting": "🏗️",
  "Other": "📋",
};
