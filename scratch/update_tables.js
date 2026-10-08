const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/dashboard/(main)/tables/TablesBoard.tsx', 'utf8');

const newButtons = `                      <div className="pt-4 mt-2 flex flex-col gap-2">
                         <button 
                            onClick={() => handleClearTable(table.id)}
                            className="w-full py-2 bg-green-50 border border-green-200 text-green-700 font-bold text-[13px] rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
                          >
                            <span className="text-green-600">💵</span> Close & pay • ₹{table.orders?.total}
                         </button>
                         <div className="flex gap-2">
                           <button 
                             onClick={() => typeof window !== 'undefined' && (window.location.href = '/dashboard/pos?append=' + table.orders?.id + '&table=' + table.table_number)}
                             className="flex-1 py-2 bg-white border border-[#EAF0F6] text-[#0A1017] font-bold text-[13px] rounded-lg hover:bg-gray-50 transition-colors"
                           >
                             + Round
                           </button>
                           <button 
                             onClick={() => alert('Move table feature coming soon!')}
                             className="flex-1 py-2 bg-white border border-[#EAF0F6] text-[#0A1017] font-bold text-[13px] rounded-lg hover:bg-gray-50 transition-colors"
                           >
                             Move
                           </button>
                           <button 
                             onClick={() => alert('Merge table feature coming soon!')}
                             className="flex-1 py-2 bg-white border border-[#EAF0F6] text-[#0A1017] font-bold text-[13px] rounded-lg hover:bg-gray-50 transition-colors"
                           >
                             Merge
                           </button>
                         </div>
                      </div>`;

code = code.replace(/<div className="pt-4 mt-2">\s*<button\s*onClick=\{[^}]+\}\s*className="w-max px-4 py-2 bg-green-50[^>]+>\s*<span[^>]+>💵<\/span> Close table • ₹\{table\.orders\?\.total\}\s*<\/button>\s*<\/div>/, newButtons);

fs.writeFileSync('app/(dashboard)/dashboard/(main)/tables/TablesBoard.tsx', code);
