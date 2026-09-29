"use client";

import { useState, useEffect, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";

type MenuItem = {
  id: string;
  item_number: number;
  item_name: string;
  category: string;
  price: number;
  available: boolean;
  description: string | null;
  image_url: string | null;
  variants: any; // jsonb
};

export default function MenuBoard() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formNumber, setFormNumber] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formAvailable, setFormAvailable] = useState(true);
  const [formVariants, setFormVariants] = useState("");
  
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const supabase = createClient() as any;

  const fetchMenu = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("menu_items")
      .select("*")
      .order("item_number", { ascending: true });

    if (err) {
      setError("Failed to fetch menu items.");
    } else {
      setItems(data as MenuItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const openAddModal = () => {
    setModalMode("add");
    setEditingId(null);
    setFormNumber("");
    setFormName("");
    setFormCategory("");
    setFormPrice("");
    setFormDescription("");
    setFormImageUrl("");
    setFormAvailable(true);
    setFormVariants("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setModalMode("edit");
    setEditingId(item.id);
    setFormNumber(item.item_number.toString());
    setFormName(item.item_name);
    setFormCategory(item.category);
    setFormPrice(item.price.toString());
    setFormDescription(item.description || "");
    setFormImageUrl(item.image_url || "");
    setFormAvailable(item.available);
    setFormVariants(item.variants ? JSON.stringify(item.variants, null, 2) : "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSaving(true);

    const itemNum = parseInt(formNumber, 10);
    const priceNum = parseFloat(formPrice);

    if (isNaN(itemNum)) {
      setFormError("Item number must be a valid integer.");
      setFormSaving(false);
      return;
    }
    if (isNaN(priceNum)) {
      setFormError("Price must be a valid number.");
      setFormSaving(false);
      return;
    }

    let variantsJson = null;
    if (formVariants.trim()) {
      try {
        variantsJson = JSON.parse(formVariants);
      } catch {
        setFormError("Variants must be valid JSON.");
        setFormSaving(false);
        return;
      }
    }

    const payload = {
      item_number: itemNum,
      item_name: formName.trim(),
      category: formCategory.trim(),
      price: priceNum,
      available: formAvailable,
      description: formDescription.trim() || null,
      image_url: formImageUrl.trim() || null,
      variants: variantsJson,
    };

    if (modalMode === "add") {
      const { error: insertErr } = await supabase.from("menu_items").insert(payload);
      if (insertErr) {
        if (insertErr.code === "23505") {
          setFormError(`Item number ${itemNum} already exists.`);
        } else {
          setFormError(insertErr.message);
        }
      } else {
        setIsModalOpen(false);
        fetchMenu();
      }
    } else {
      const { error: updateErr } = await supabase.from("menu_items").update(payload).eq("id", editingId!);
      if (updateErr) {
        if (updateErr.code === "23505") {
          setFormError(`Item number ${itemNum} already exists.`);
        } else {
          setFormError(updateErr.message);
        }
      } else {
        setIsModalOpen(false);
        fetchMenu();
      }
    }

    setFormSaving(false);
  };

  const handleToggle = async (item: MenuItem) => {
    const { error: err } = await supabase
      .from("menu_items")
      .update({ available: !item.available })
      .eq("id", item.id);
    if (!err) {
      setItems(items.map(i => (i.id === item.id ? { ...i, available: !item.available } : i)));
    } else {
      alert("Failed to toggle visibility: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this menu item?")) return;
    const { error: err } = await supabase.from("menu_items").delete().eq("id", id);
    if (err) {
      if (err.code === "23503") {
        alert("Cannot delete this item because it exists in historical orders. Please hide it instead.");
      } else {
        alert("Failed to delete item: " + err.message);
      }
    } else {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const categories = Object.keys(grouped).sort();

  return (
    <div className="flex flex-col gap-6 p-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-gray-500">Manage your menu items, categories, and availability.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white transition hover:opacity-90"
        >
          <Plus className="h-5 w-5" />
          Add Item
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-gray-200 bg-white">
          <p className="text-gray-500">Loading menu...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white gap-2">
          <p className="text-gray-500">No menu items found.</p>
          <button onClick={openAddModal} className="text-red-600 font-semibold hover:underline">
            Add your first item
          </button>
        </div>
      ) : (
        categories.map((cat) => (
          <div key={cat} className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="bg-gray-100 px-6 py-3 font-semibold text-gray-800">
              {cat}
            </div>
            <div className="divide-y divide-[var(--line)]">
              {grouped[cat].map((item) => (
                <div key={item.id} className={`flex items-center justify-between p-6 transition hover:bg-gray-50 ${!item.available ? "opacity-60 bg-gray-50" : ""}`}>
                  <div className="flex items-center gap-4">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.item_name} className="h-16 w-16 rounded-lg object-cover border border-gray-200" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 border border-gray-200 text-xs text-gray-400">
                        No Img
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">#{item.item_number}</span>
                        <h3 className="font-semibold">{item.item_name}</h3>
                        {!item.available && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">Hidden</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{item.description || "No description"}</p>
                      <p className="font-semibold text-red-600 mt-1">₹{item.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(item)}
                      title={item.available ? "Hide item" : "Show item"}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                    >
                      {item.available ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      title="Edit item"
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      title="Delete item"
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 transition"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold">{modalMode === "add" ? "Add Menu Item" : "Edit Menu Item"}</h2>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {formError && (
                <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                  {formError}
                </div>
              )}
              
              <form id="menu-form" onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Item Number *</label>
                  <input required type="number" value={formNumber} onChange={e => setFormNumber(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-[var(--red)]" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Item Name *</label>
                  <input required type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-[var(--red)]" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Category *</label>
                  <input required type="text" value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-[var(--red)]" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Price (₹) *</label>
                  <input required type="number" step="0.01" value={formPrice} onChange={e => setFormPrice(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-[var(--red)]" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea rows={2} value={formDescription} onChange={e => setFormDescription(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-[var(--red)]" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium">Image URL</label>
                  <input type="url" value={formImageUrl} onChange={e => setFormImageUrl(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-[var(--red)]" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium">Variants JSON (Optional)</label>
                  <textarea rows={4} placeholder='{"options": [{"label": "Size", "values": ["Regular", "Large"]}]}' value={formVariants} onChange={e => setFormVariants(e.target.value)} className="w-full font-mono text-xs rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-[var(--red)]" />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2 mt-2">
                  <input type="checkbox" id="available" checked={formAvailable} onChange={e => setFormAvailable(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-[var(--red)]" />
                  <label htmlFor="available" className="text-sm font-medium">Visible to customers (Available)</label>
                </div>
              </form>
            </div>
            
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 transition">
                Cancel
              </button>
              <button type="submit" form="menu-form" disabled={formSaving} className="rounded-xl bg-red-600 px-6 py-2 font-semibold text-white hover:opacity-90 transition disabled:opacity-50">
                {formSaving ? "Saving..." : "Save Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
