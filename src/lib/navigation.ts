export type ProfileRole = "tenant" | "landlord";

export type NavItem = {
  href: string;
  label: string;
};

export const tenantNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/properties", label: "Browse Properties" },
  { href: "/favorites", label: "Favorites" },
  { href: "/messages", label: "Messages" },
  { href: "/dashboard#payments", label: "Payments" },
  { href: "/settings", label: "Settings" },
];

export const landlordNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/properties", label: "Properties" },
  { href: "/dashboard#add-listing", label: "Add Listing" },
  { href: "/dashboard#tenants", label: "Tenants" },
  { href: "/messages", label: "Messages" },
  { href: "/dashboard#analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export function getNavItemsForRole(role: ProfileRole | null) {
  if (role === "landlord") {
    return landlordNavItems;
  }

  if (role === "tenant") {
    return tenantNavItems;
  }

  return [];
}
