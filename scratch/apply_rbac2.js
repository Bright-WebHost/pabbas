const fs = require('fs');

// 1. Update layout.tsx
let layout = fs.readFileSync('app/(dashboard)/dashboard/(main)/layout.tsx', 'utf8');

layout = layout.replace(
  '.select("email")',
  '.select("email, role")'
);

layout = layout.replace(
  '<Sidebar />',
  '<Sidebar role={staffData.role || "admin"} />'
);

fs.writeFileSync('app/(dashboard)/dashboard/(main)/layout.tsx', layout);

// 2. Update Sidebar.tsx
let sidebar = fs.readFileSync('components/dashboard/Sidebar.tsx', 'utf8');

sidebar = sidebar.replace(
  'export default function Sidebar() {',
  'export default function Sidebar({ role = "admin" }: { role?: string }) {'
);

const allowedLinksLogic = `
  const canSee = (link: string) => {
    if (role === 'admin') return true;
    if (role === 'kitchen') {
      return ['orders', 'stats'].includes(link);
    }
    if (role === 'waiter' || role === 'counter') {
      return ['orders', 'pos', 'tables'].includes(link);
    }
    return true;
  };
`;

sidebar = sidebar.replace(
  'const { refreshOrders, toggleSound, soundEnabled } = useOrderManager();',
  'const { refreshOrders, toggleSound, soundEnabled } = useOrderManager();\n' + allowedLinksLogic
);

// Conditionally wrap the SidebarLink components
sidebar = sidebar.replace('<SidebarLink href="/dashboard" label="Orders" icon="🧾" active={pathname === "/dashboard"} />', '{canSee("orders") && <SidebarLink href="/dashboard" label="Orders" icon="🧾" active={pathname === "/dashboard"} />}');
sidebar = sidebar.replace('<SidebarLink href="/dashboard/pos" label="POS" icon="💻" active={pathname === "/dashboard/pos"} />', '{canSee("pos") && <SidebarLink href="/dashboard/pos" label="POS" icon="💻" active={pathname === "/dashboard/pos"} />}');
sidebar = sidebar.replace('<SidebarLink href="/dashboard/tables" label="Tables" icon="🍽️" active={pathname === "/dashboard/tables"} />', '{canSee("tables") && <SidebarLink href="/dashboard/tables" label="Tables" icon="🍽️" active={pathname === "/dashboard/tables"} />}');
sidebar = sidebar.replace('<SidebarLink href="/dashboard/chat" label="Live Chat" icon="💬" active={pathname === "/dashboard/chat"} />', '{role === "admin" && <SidebarLink href="/dashboard/chat" label="Live Chat" icon="💬" active={pathname === "/dashboard/chat"} />}');
sidebar = sidebar.replace('<SidebarLink href="/dashboard/menu" label="Menu" icon="📋" active={pathname === "/dashboard/menu"} />', '{role === "admin" && <SidebarLink href="/dashboard/menu" label="Menu" icon="📋" active={pathname === "/dashboard/menu"} />}');
sidebar = sidebar.replace('<SidebarLink href="/dashboard/riders" label="Riders" icon="🛵" active={pathname === "/dashboard/riders"} />', '{role === "admin" && <SidebarLink href="/dashboard/riders" label="Riders" icon="🛵" active={pathname === "/dashboard/riders"} />}');
sidebar = sidebar.replace('<SidebarLink href="/dashboard/stats" label="Analytics" icon="📊" active={pathname === "/dashboard/stats"} />', '{canSee("stats") && <SidebarLink href="/dashboard/stats" label="Analytics" icon="📊" active={pathname === "/dashboard/stats"} />}');
sidebar = sidebar.replace('<SidebarLink href="/dashboard/contacts" label="Contacts" icon="👥" active={pathname === "/dashboard/contacts"} />', '{role === "admin" && <SidebarLink href="/dashboard/contacts" label="Contacts" icon="👥" active={pathname === "/dashboard/contacts"} />}');
sidebar = sidebar.replace('<SidebarLink href="/dashboard/blast" label="Blast" icon="📣" active={pathname === "/dashboard/blast"} />', '{role === "admin" && <SidebarLink href="/dashboard/blast" label="Blast" icon="📣" active={pathname === "/dashboard/blast"} />}');

// Mobile Tabs
sidebar = sidebar.replace('<MobileTab href="/dashboard" icon="🧾" active={pathname === "/dashboard"} />', '{canSee("orders") && <MobileTab href="/dashboard" icon="🧾" active={pathname === "/dashboard"} />}');
sidebar = sidebar.replace('<MobileTab href="/dashboard/pos" icon="💻" active={pathname === "/dashboard/pos"} />', '{canSee("pos") && <MobileTab href="/dashboard/pos" icon="💻" active={pathname === "/dashboard/pos"} />}');
sidebar = sidebar.replace('<MobileTab href="/dashboard/tables" icon="🍽️" active={pathname === "/dashboard/tables"} />', '{canSee("tables") && <MobileTab href="/dashboard/tables" icon="🍽️" active={pathname === "/dashboard/tables"} />}');
sidebar = sidebar.replace('<MobileTab href="/dashboard/menu" icon="📋" active={pathname === "/dashboard/menu"} />', '{role === "admin" && <MobileTab href="/dashboard/menu" icon="📋" active={pathname === "/dashboard/menu"} />}');
sidebar = sidebar.replace('<MobileTab href="/dashboard/riders" icon="🛵" active={pathname === "/dashboard/riders"} />', '{role === "admin" && <MobileTab href="/dashboard/riders" icon="🛵" active={pathname === "/dashboard/riders"} />}');
sidebar = sidebar.replace('<MobileTab href="/dashboard/stats" icon="📊" active={pathname === "/dashboard/stats"} />', '{canSee("stats") && <MobileTab href="/dashboard/stats" icon="📊" active={pathname === "/dashboard/stats"} />}');

fs.writeFileSync('components/dashboard/Sidebar.tsx', sidebar);

console.log('Successfully applied RBAC!');
