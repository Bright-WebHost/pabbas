const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/dashboard/(main)/pos/PosBoard.tsx', 'utf8');

// 1. Add appendOrderId state
if (!code.includes('const [appendOrderId, setAppendOrderId]')) {
  code = code.replace(
    'const [editOrderId, setEditOrderId] = useState<string | null>(null);',
    'const [editOrderId, setEditOrderId] = useState<string | null>(null);\n  const [appendOrderId, setAppendOrderId] = useState<string | null>(null);'
  );
}

// 2. Add URL param parsing for append
const urlParamsParsing = `      // Check for edit or append mode
      const params = new URLSearchParams(window.location.search);
      const editId = params.get("edit");
      const appendId = params.get("append");
      const activeId = editId || appendId;

      if (activeId) {
        if (editId) setEditOrderId(editId);
        if (appendId) setAppendOrderId(appendId);

        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("id", activeId)
          .single();
        
        const orderData = data as any;
        if (orderData) {
          setOrderType(orderData.order_type as any);
          setCustomerName(orderData.customer_name || "");
          setWhatsappNumber(orderData.customer_phone || "");
          setTableNumber(orderData.table_number || "");
          setDeliveryAddress(orderData.address || "");
          setDeliveryLandmark(orderData.landmark || "");
          setDeliveryPincode(orderData.pincode || "");
          
          if (editId && orderData.items_json && Array.isArray(orderData.items_json)) {
            setCart(orderData.items_json.map((item: any) => ({
              cartId: \`\${item.menu_item_id}-\${item.variant_name || 'default'}\`,
              menu_item_id: item.menu_item_id,
              item_name: item.item_name,
              unit_price: item.unit_price,
              quantity: item.quantity,
              variant_name: item.variant_name || null
            })));
          }
        }
      }`;

code = code.replace(/      \/\/ Check for edit mode\s+const params = new URLSearchParams\(window\.location\.search\);\s+const editId = params\.get\("edit"\);\s+if \(editId\) \{[\s\S]*?\}\s+\}/, urlParamsParsing);


// 3. Add handleConfirmOrder support for appendOrderId
const confirmOrderLogic = `  const handleConfirmOrder = () => {
    startTransition(async () => {
      if (appendOrderId) {
        try {
          const res = await fetch("/api/orders/append", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: appendOrderId,
              table_number: tableNumber,
              new_items: cart.map(c => ({
                menu_item_id: c.menu_item_id,
                item_name: c.item_name,
                quantity: c.quantity,
                unit_price: c.unit_price,
                variant_name: c.variant_name
              }))
            })
          });
          const result = await res.json();
          if (result.success) {
            setOrderResult({ success: true, order_number: "Round Added" });
            setCart([]);
            setTimeout(() => {
              if (typeof window !== "undefined") window.location.href = "/dashboard/tables";
            }, 1500);
          } else {
            setOrderResult({ success: false, error: result.error });
          }
        } catch (error) {
          setOrderResult({ success: false, error: "Failed to add round." });
        }
        return;
      }

      const itemsSummary = cart.map((c) => \`\${c.item_name} x \${c.quantity}\`).join(', ');`;

code = code.replace(/  const handleConfirmOrder = \(\) => \{\s+startTransition\(async \(\) => \{\s+const itemsSummary = cart\.map\(\(c\) => \`\$\{c\.item_name\} x \$\{c\.quantity\}\`\)\.join\(\', \'\);/, confirmOrderLogic);

// 4. In handleConfirmOrder, fix the editOrderId redirect to go back to tables if it was a dine-in
const editRedirectLogic = `        if (editOrderId) {
          result = await updatePosOrder(editOrderId, payload);
          if (result.success) {
             setTimeout(() => {
                if (typeof window !== "undefined") {
                  window.location.href = orderType === "dine-in" ? "/dashboard/tables" : "/dashboard";
                }
             }, 1500);
          }
        }`;

code = code.replace(/        if \(editOrderId\) \{\s+result = await updatePosOrder\(editOrderId, payload\);\s+\}/, editRedirectLogic);

fs.writeFileSync('app/(dashboard)/dashboard/(main)/pos/PosBoard.tsx', code);
