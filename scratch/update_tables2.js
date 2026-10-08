const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/dashboard/(main)/tables/TablesBoard.tsx', 'utf8');

// 1. Add imports for moveTable and mergeTables
code = code.replace(
  'import { fetchTables, addTable, deleteTable, clearTable, RestaurantTable } from "./actions";',
  'import { fetchTables, addTable, deleteTable, clearTable, RestaurantTable, moveTable, mergeTables } from "./actions";'
);

// 2. Add state variables for move/merge modals
const stateVars = `  const [moveModalOrder, setMoveModalOrder] = useState<{orderId: string, oldTableNumber: string} | null>(null);
  const [mergeModalOrder, setMergeModalOrder] = useState<{orderId: string, sourceTableNumber: string} | null>(null);
  const [selectedTargetTable, setSelectedTargetTable] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);`;

code = code.replace(
  'const [loadingHistory, setLoadingHistory] = useState(false);',
  'const [loadingHistory, setLoadingHistory] = useState(false);\n' + stateVars
);

// 3. Add handleMove and handleMerge handlers
const handlers = `
  const handleConfirmMove = async () => {
    if (!moveModalOrder || !selectedTargetTable) return;
    setIsProcessing(true);
    const result = await moveTable(moveModalOrder.orderId, moveModalOrder.oldTableNumber, selectedTargetTable);
    setIsProcessing(false);
    if (result.success) {
      setMoveModalOrder(null);
      setSelectedTargetTable("");
      loadTables(true);
    } else {
      alert(result.error);
    }
  };

  const handleConfirmMerge = async () => {
    if (!mergeModalOrder || !selectedTargetTable) return;
    const targetTable = tables.find(t => t.table_number === selectedTargetTable);
    if (!targetTable || !targetTable.current_order_id) return;
    
    setIsProcessing(true);
    const result = await mergeTables(mergeModalOrder.orderId, targetTable.current_order_id, mergeModalOrder.sourceTableNumber);
    setIsProcessing(false);
    if (result.success) {
      setMergeModalOrder(null);
      setSelectedTargetTable("");
      loadTables(true);
    } else {
      alert(result.error);
    }
  };
`;

code = code.replace(
  'const openHistory = async (tableNumber: string) => {',
  handlers + '\n  const openHistory = async (tableNumber: string) => {'
);

// 4. Modify the buttons in the render loop
code = code.replace(
  "onClick={() => alert('Move table feature coming soon!')}",
  "onClick={() => setMoveModalOrder({ orderId: table.orders!.id, oldTableNumber: table.table_number })}"
);
code = code.replace(
  "onClick={() => alert('Merge table feature coming soon!')}",
  "onClick={() => setMergeModalOrder({ orderId: table.orders!.id, sourceTableNumber: table.table_number })}"
);

// 5. Add Modals
const modals = `
      {moveModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1017]/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-[#EAF0F6]">
            <div className="p-6 border-b border-[#EAF0F6] bg-[#F8FAFB]">
              <h2 className="text-xl font-black text-[#0A1017]">Move Table {moveModalOrder.oldTableNumber}</h2>
              <p className="text-[13px] text-[#8799AF] mt-1 font-medium">Select an empty table to move this order to.</p>
            </div>
            <div className="p-6">
              <select 
                value={selectedTargetTable} 
                onChange={e => setSelectedTargetTable(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#EAF0F6] bg-[#F8FAFB] text-[14px] font-bold text-[#0A1017] focus:border-[#0D6EFD] outline-none transition-all"
              >
                <option value="">Select destination table...</option>
                {tables.filter(t => !t.is_active && t.table_number !== moveModalOrder.oldTableNumber).map(t => (
                  <option key={t.id} value={t.table_number}>{t.table_number}</option>
                ))}
              </select>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => { setMoveModalOrder(null); setSelectedTargetTable(""); }}
                  className="flex-1 py-3 bg-[#F8FAFB] border border-[#EAF0F6] text-[#6B7A90] font-bold text-[14px] rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmMove}
                  disabled={!selectedTargetTable || isProcessing}
                  className="flex-1 py-3 bg-[#0D6EFD] text-white font-bold text-[14px] rounded-xl hover:bg-[#0B5ED7] transition-colors disabled:opacity-50"
                >
                  {isProcessing ? "Moving..." : "Confirm Move"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mergeModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1017]/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-[#EAF0F6]">
            <div className="p-6 border-b border-[#EAF0F6] bg-[#F8FAFB]">
              <h2 className="text-xl font-black text-[#0A1017]">Merge Table {mergeModalOrder.sourceTableNumber}</h2>
              <p className="text-[13px] text-[#8799AF] mt-1 font-medium">Select an active table to merge into. This will transfer all items and close Table {mergeModalOrder.sourceTableNumber}.</p>
            </div>
            <div className="p-6">
              <select 
                value={selectedTargetTable} 
                onChange={e => setSelectedTargetTable(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#EAF0F6] bg-[#F8FAFB] text-[14px] font-bold text-[#0A1017] focus:border-[#0D6EFD] outline-none transition-all"
              >
                <option value="">Select target table...</option>
                {tables.filter(t => t.is_active && t.table_number !== mergeModalOrder.sourceTableNumber).map(t => (
                  <option key={t.id} value={t.table_number}>{t.table_number} (₹{t.orders?.total})</option>
                ))}
              </select>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => { setMergeModalOrder(null); setSelectedTargetTable(""); }}
                  className="flex-1 py-3 bg-[#F8FAFB] border border-[#EAF0F6] text-[#6B7A90] font-bold text-[14px] rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmMerge}
                  disabled={!selectedTargetTable || isProcessing}
                  className="flex-1 py-3 bg-[#0D6EFD] text-white font-bold text-[14px] rounded-xl hover:bg-[#0B5ED7] transition-colors disabled:opacity-50"
                >
                  {isProcessing ? "Merging..." : "Confirm Merge"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(
  '{historyModalTable && (',
  modals + '\n      {historyModalTable && ('
);

fs.writeFileSync('app/(dashboard)/dashboard/(main)/tables/TablesBoard.tsx', code);
