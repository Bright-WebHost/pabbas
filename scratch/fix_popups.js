const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/dashboard/OrderManagerProvider.tsx', 'utf8');

if (!content.includes('import { useStaff }')) {
  content = content.replace(
    'import { createClient } from "@/lib/supabase/client";',
    'import { createClient } from "@/lib/supabase/client";\nimport { useStaff } from "@/components/providers/StaffProvider";'
  );
}

content = content.replace(
  'const [lastUpdated, setLastUpdated] = useState<Date | null>(null);',
  'const [lastUpdated, setLastUpdated] = useState<Date | null>(null);\n  const { hasPerm } = useStaff();'
);

const oldLogic =       const unackNew = latestOrders.filter(o => {
        if (o.source === 'pos') return false;
        
        // It's also unacknowledged if it's an existing order (e.g. preparing) BUT has new additions
        if (Array.isArray(o.items_json) && o.items_json.some((i: any) => i.is_new_addition)) {
          return true;
        }

        if (acknowledgedIds.current.has(o.id)) return false;
        
        // It's unacknowledged if it's entirely new
        if (o.status === 'new') return true;
        
        return false;
      });;

const newLogic =       const unackNew = latestOrders.filter(o => {
        if (o.source === 'pos') return false;
        
        // If it's an existing order BUT has new additions
        if (Array.isArray(o.items_json) && o.items_json.some((i: any) => i.is_new_addition)) {
          // If kitchen, only show additions if status is preparing
          if (hasPerm("mark_ready") && !hasPerm("view_orders_full") && o.status !== 'preparing') return false;
          return true;
        }

        if (acknowledgedIds.current.has(o.id)) return false;
        
        const isKitchenOnly = hasPerm("mark_ready") && !hasPerm("view_orders_full");
        const isAdminOrCounter = hasPerm("view_orders_full");

        if (isAdminOrCounter && o.status === 'new') return true;
        if (isKitchenOnly && o.status === 'preparing') return true;
        
        return false;
      });;

content = content.replace(oldLogic, newLogic);

const oldInitialLogic =       const unackNew = initialOrders.filter(o => {
        if (o.source === 'pos') return false;

        if (Array.isArray(o.items_json) && o.items_json.some((i: any) => i.is_new_addition)) return true;

        if (acknowledgedIds.current.has(o.id)) return false;
        if (o.status === 'new') return true;
        return false;
      });;

const newInitialLogic =       const unackNew = initialOrders.filter(o => {
        if (o.source === 'pos') return false;

        if (Array.isArray(o.items_json) && o.items_json.some((i: any) => i.is_new_addition)) {
          if (hasPerm("mark_ready") && !hasPerm("view_orders_full") && o.status !== 'preparing') return false;
          return true;
        }

        if (acknowledgedIds.current.has(o.id)) return false;
        
        const isKitchenOnly = hasPerm("mark_ready") && !hasPerm("view_orders_full");
        const isAdminOrCounter = hasPerm("view_orders_full");

        if (isAdminOrCounter && o.status === 'new') return true;
        if (isKitchenOnly && o.status === 'preparing') return true;
        return false;
      });;

content = content.replace(oldInitialLogic, newInitialLogic);

fs.writeFileSync('app/(dashboard)/dashboard/OrderManagerProvider.tsx', content);
console.log('Fixed popups in OrderManagerProvider');
