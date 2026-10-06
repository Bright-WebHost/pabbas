"use client";

import { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, Clock3, MapPin, Minus, Plus, Search, ShoppingBag, Sparkles, Trash2, Utensils, X, Star, Info, ChevronDown, SlidersHorizontal, Bookmark, Share2, Users, MoreVertical, ChevronLeft, LogOut } from "lucide-react";
import { categories, displayCategory } from "@/lib/menu-data";
import { CartItem, CustomerDetails, MenuItem, OrderType, PaymentMethod } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const initialDetails: CustomerDetails = { name: "", phone: "", address: "", landmark: "", pincode: "", pickupDate: "", pickupTime: "19:00", payment: "cash" };

type Screen = "welcome" | "menu" | "checkout" | "confirmed";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [table, setTable] = useState("No table / Takeaway");
  const [category, setCategory] = useState("All");
  const [dietFilter, setDietFilter] = useState<"All" | "Veg" | "Non-veg">("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [details, setDetails] = useState<CustomerDetails>(initialDetails);
  
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuMenuOpen, setMenuMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderItems, setActiveOrderItems] = useState<any[]>([]);
  const [activeOrderStatus, setActiveOrderStatus] = useState<string | null>(null);
  const [activeOrderTotal, setActiveOrderTotal] = useState<number>(0);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState(false);

  const fetchMenu = async () => {
    setIsLoadingMenu(true);
    setMenuError(false);

    try {
      const res = await fetch('/api/menu', { cache: 'no-store' });
      if (!res.ok) {
        setMenuItems([]);
        setMenuError(true);
        return;
      }

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setMenuItems(items);
      setMenuError(false);
    } catch (err) {
      console.error('Failed to fetch menu:', err);
      setMenuItems([]);
      setMenuError(true);
    } finally {
      setIsLoadingMenu(false);
    }
  };

  useEffect(() => {
    fetchMenu();
    
    // Check for table QR code parameter
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get("table");
    if (tableParam) {
      setOrderType("dine-in");
      setTable(tableParam);
      setScreen("menu"); // Go straight to menu
      
      // Fetch active order for this table
      fetch(`/api/tables/active?table=${encodeURIComponent(tableParam)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.active_order) {
            setActiveOrderId(data.active_order.id);
            setActiveOrderItems(data.active_order.items || []);
            setActiveOrderStatus(data.active_order.status);
            setActiveOrderTotal(data.active_order.total || 0);
          }
        })
        .catch(console.error);
    }
  }, []);

  const visibleItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchSearch = `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "All" || displayCategory(item.category) === category;
      const matchDiet = dietFilter === "All" || (dietFilter === "Veg" ? item.vegetarian : !item.vegetarian);
      return matchSearch && matchCat && matchDiet;
    });
  }, [category, search, menuItems, dietFilter]);
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const newItemsSubtotal = cart.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const subtotal = newItemsSubtotal + activeOrderTotal;
  const deliveryFee = orderType === "delivery" && subtotal > 0 ? 35 : 0;
  const total = subtotal + deliveryFee;

  const addToCart = (item: MenuItem, amount = 1) => { 
    setCart((current) => { 
      const existing = current.find((line) => line.item.id === item.id); 
      return existing ? current.map((line) => line.item.id === item.id ? { ...line, quantity: line.quantity + amount } : line) : [...current, { item, quantity: amount }]; 
    }); 
    setNotice(`${item.name} added`); 
    window.setTimeout(() => setNotice(""), 1800); 
  };

  const changeQuantity = (id: string, delta: number) => setCart((current) => current.flatMap((line) => line.item.id === id ? (line.quantity + delta > 0 ? [{ ...line, quantity: line.quantity + delta }] : []) : [line]));
  const quantityFor = (id: string) => cart.find((line) => line.item.id === id)?.quantity ?? 0;
  const selectCategory = (value: string) => { setCategory(value); setMenuMenuOpen(false); document.getElementById("menu-list")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const [tables, setTables] = useState<import("@/lib/supabase/types").RestaurantTableRow[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [partySize, setPartySize] = useState<number>(2);
  const [isAsap, setIsAsap] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/tables');
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
        if (data.tables && data.tables.length > 0) {
          setSelectedTableId(data.tables[0].id);
          setTable(data.tables[0].table_number);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (orderType === "dine-in") {
      fetchTables();
    }
  }, [orderType]);

  const placeOrder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError("");

    const currentIdempotencyKey = idempotencyKey || (typeof crypto !== 'undefined' ? crypto.randomUUID() : `idemp-${Date.now()}`);
    if (!idempotencyKey) setIdempotencyKey(currentIdempotencyKey);

    try {
      if (activeOrderId && orderType === "dine-in") {
        // APPEND TO EXISTING ORDER
        const appendPayload = {
          order_id: activeOrderId,
          table_number: table,
          new_items: cart.map(line => ({
            menu_item_id: line.item.id,
            item_name: line.item.name,
            quantity: line.quantity,
            price: line.item.price
          }))
        };
        const res = await fetch('/api/orders/append', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appendPayload)
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          setOrderNumber(data.merged_items ? "Updated successfully" : "Updated");
          setCart([]);
          setCartOpen(false);
          setScreen("confirmed");
          if (data.new_total) setActiveOrderTotal(data.new_total);
          if (data.merged_items) setActiveOrderItems(data.merged_items);
        } else {
          setSubmitError(data.error || "Failed to update order");
        }
      } else {
        // CREATE NEW ORDER
        const payload = {
          order_type: orderType,
          table_number: orderType === "dine-in" ? table : null,
          customer_name: details.name,
          customer_phone: details.phone,
          delivery_address: orderType === "delivery" ? details.address : null,
          landmark: orderType === "delivery" ? details.landmark : null,
          pincode: orderType === "delivery" ? details.pincode : null,
          scheduled_time: !isAsap && details.pickupDate && details.pickupTime ? new Date(`${details.pickupDate}T${details.pickupTime}`).toISOString() : null,
          payment_method: details.payment,
          idempotency_key: currentIdempotencyKey,
          cart_items: cart.map(line => ({
            menu_item_id: line.item.id,
            quantity: line.quantity
          }))
        };

        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        if (!res.ok || data.error) {
          setSubmitError(data.error || 'Failed to place order');
          setIsSubmitting(false);
          return;
        }

        setOrderNumber(data.order?.order_number || `PAB-${Math.floor(1000 + Math.random() * 8999)}`);
        setScreen("confirmed");
        setCartOpen(false);
      } // CLOSE THE ELSE BLOCK
    } catch (err: any) {
      setSubmitError(err?.message || 'Network error placing order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (screen === "welcome") return <Welcome orderType={orderType} setOrderType={(type) => { setOrderType(type); setScreen("menu"); }} />;

  if (screen === "checkout") return <Checkout activeOrderItems={activeOrderItems} orderType={orderType} table={table} setTable={setTable} tables={tables} selectedTableId={selectedTableId} setSelectedTableId={setSelectedTableId} partySize={partySize} setPartySize={setPartySize} isAsap={isAsap} setIsAsap={setIsAsap} cart={cart} total={total} details={details} setDetails={setDetails} isSubmitting={isSubmitting} submitError={submitError} onBack={() => setScreen("menu")} onPlace={placeOrder} />;

  if (screen === "confirmed") return <Confirmation orderNumber={orderNumber} orderType={orderType} table={table} cart={cart} total={total} onContinue={() => { setScreen("welcome"); setCart([]); setIdempotencyKey(""); }} />;


  return <div className="min-h-screen bg-gray-50 text-gray-900 pb-[80px]">
    <div className="max-w-[768px] mx-auto bg-white min-h-screen relative shadow-sm">
      <Header search={search} setSearch={setSearch} onBack={() => setScreen("welcome")} />
      
      <RestaurantInfo orderType={orderType} table={table} />

      <nav aria-label="Menu categories" className="sticky top-[64px] z-30 flex gap-3 overflow-x-auto bg-white px-4 py-3 border-b border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.04)] no-scrollbar">
        <button onClick={() => setMenuMenuOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[13px] font-bold shrink-0 text-gray-700 transition">
          <SlidersHorizontal size={14}/> {category === "All" ? "Categories" : category} <ChevronDown size={14}/>
        </button>
        <button onClick={() => setDietFilter(prev => prev === "Veg" ? "All" : "Veg")} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[13px] font-bold shrink-0 transition ${dietFilter === "Veg" ? "bg-green-50 border-green-200 text-green-700 shadow-sm" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
          <span className="w-3.5 h-3.5 border-[1.5px] border-green-600 flex items-center justify-center rounded-[2px]"><span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span></span> Veg
        </button>
        <button onClick={() => setDietFilter(prev => prev === "Non-veg" ? "All" : "Non-veg")} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[13px] font-bold shrink-0 transition ${dietFilter === "Non-veg" ? "bg-red-50 border-red-200 text-red-700 shadow-sm" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
          <span className="w-3.5 h-3.5 border-[1.5px] border-red-700 flex items-center justify-center rounded-[2px]"><span className="w-1.5 h-1.5 bg-red-700 rounded-full"></span></span> Non-veg
        </button>
      </nav>

      <main className="w-full" id="menu-list">
        <section className="pt-6">
          <h2 className="text-xl font-extrabold mb-4 px-4 text-gray-800">{category === "All" ? "Recommended" : category}</h2>
          <div className="flex flex-col">
            {visibleItems.map((item) => (
              <ProductCard key={item.id} item={item} quantity={quantityFor(item.id)} onAdd={addToCart} onChange={changeQuantity} onDetails={setSelectedItem} />
            ))}
          </div>
          {isLoadingMenu && <div className="py-12 text-center text-gray-500">Loading menu...</div>}
          {!isLoadingMenu && menuError && (
            <div className="px-4 py-12 text-center">
              <p className="text-gray-700 font-medium">Unable to load the menu right now. Please try again.</p>
              <button
                type="button"
                onClick={fetchMenu}
                className="mt-4 rounded-full bg-[#ef4f5f] px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Try again
              </button>
            </div>
          )}
          {!isLoadingMenu && !menuError && visibleItems.length === 0 && <div className="py-12 text-center text-gray-500">No dishes are currently available.</div>}
        </section>
      </main>

      {/* Floating Menu Button */}
      <button onClick={() => setMenuMenuOpen(true)} className="fixed bottom-[88px] right-4 sm:absolute sm:bottom-24 sm:right-4 z-40 bg-[#252525] text-white px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-xl shadow-black/20 border border-gray-700">
        <Utensils size={15} /> Menu
      </button>

      {/* Floating Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-0 sm:left-0 sm:right-0 z-40 bg-white px-4 pb-4 pt-2 border-t border-gray-100">
          <button onClick={() => setCartOpen(true)} className="w-full bg-[#ef4f5f] text-white rounded-[14px] h-[52px] flex items-center justify-between px-4 font-medium shadow-md shadow-red-500/20 active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-white/20 rounded flex items-center justify-center text-sm font-bold shadow-sm">
                <ShoppingBag size={14} className="opacity-90"/>
              </div>
              <span className="font-semibold">{itemCount} item added</span>
            </div>
            <span className="flex items-center gap-1 text-[16px] font-semibold">Continue <ChevronRight size={18} /></span>
          </button>
        </div>
      )}

      {/* Menu Categories Modal */}
      <AnimatePresence>
        {menuMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setMenuMenuOpen(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl p-4 w-full max-w-[280px] shadow-2xl max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-3 pb-2 border-b border-gray-100">Menu</h3>
              <div className="flex flex-col">
                <button onClick={() => selectCategory("All")} className="text-left py-3 text-sm font-medium text-gray-800 border-b border-gray-50 flex justify-between">All Items <span>{menuItems.length}</span></button>
                {categories.map(cat => (
                  <button key={cat} onClick={() => selectCategory(cat)} className="text-left py-3 text-sm font-medium text-gray-800 border-b border-gray-50 flex justify-between">{cat}</button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {notice && <motion.div key="notice" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-50 bg-[#252525] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg whitespace-nowrap">{notice}</motion.div>}
        {selectedItem && <ProductDetails key="details" item={selectedItem} onClose={() => setSelectedItem(null)} onAdd={(item, amount) => { addToCart(item, amount); setSelectedItem(null); }} />}
        {cartOpen && <div key="cart" className="fixed inset-0 z-50 bg-black/60 flex flex-col justify-end sm:items-center sm:p-5">
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="max-h-[85vh] w-full sm:max-w-md overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-gray-50 p-5 pb-24 relative">
            <div className="mb-4 flex items-center justify-between sticky top-0 bg-gray-50 z-10 py-2 border-b border-gray-200">
              <h2 className="text-xl font-bold">Your Order</h2>
              <button aria-label="Close cart" onClick={() => setCartOpen(false)} className="p-2 rounded-full bg-white border border-gray-200 text-gray-600"><X size={19} /></button>
            </div>
            <CartPanel cart={cart} activeOrderItems={activeOrderItems} subtotal={subtotal} deliveryFee={deliveryFee} total={total} onChange={changeQuantity} onCheckout={() => {setCartOpen(false); setScreen("checkout");}} />
          </motion.div>
        </div>}
      </AnimatePresence>
    </div>
  </div>;
}

function Header({ search, setSearch, onBack }: { search: string, setSearch: (v: string) => void, onBack: () => void }) {
  return <header className="sticky top-0 z-40 bg-white px-3 py-3 flex items-center gap-2 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
    <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100 shrink-0">
      <ChevronLeft size={26} strokeWidth={2.5} className="text-gray-800" />
    </button>
    <div className="flex-1 relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#ef4f5f]" size={18} strokeWidth={2.5}/>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search in Pabbas" className="w-full bg-white border border-gray-200 rounded-full h-11 pl-10 pr-4 text-[15px] shadow-sm outline-none focus:border-gray-300 placeholder:text-gray-400 font-medium" />
    </div>
    <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center shrink-0 shadow-sm active:bg-gray-50">
      <MoreVertical size={18} className="text-gray-700"/>
    </button>
  </header>
}

function RestaurantInfo({ orderType, table }: { orderType: OrderType, table: string }) {
  return <div className="px-4 pt-4 pb-4 bg-white border-b border-gray-100">
    <div className="flex justify-between items-start gap-4">
      <div className="flex-1">
        <h1 className="text-[26px] font-extrabold flex items-center gap-2 text-gray-900 leading-tight">Pabbas <Info size={18} className="text-gray-400 mt-1"/></h1>
        <p className="text-gray-600 text-[13px] mt-1.5 flex items-center gap-1 font-medium"><MapPin size={14} className="text-gray-400"/> 1.2 km • Lalbagh</p>
        <p className="text-gray-600 text-[13px] mt-1 flex items-center gap-1 font-medium">
          <Clock3 size={14} className="text-gray-400"/>
          {orderType === 'dine-in' ? (
            <>Dine-In • Table {table}</>
          ) : (
            <>25-30 mins • {orderType === 'pickup' ? 'Takeaway' : 'Delivery'} <ChevronDown size={14} className="text-gray-400"/></>
          )}
        </p>
      </div>
      <div className="flex flex-col items-center border border-gray-200 rounded-xl p-2 shadow-sm shrink-0 mt-1">
        <span className="flex items-center gap-1 text-green-700 font-bold text-[15px] bg-green-100 px-1.5 py-0.5 rounded-lg leading-none">
          <div className="bg-green-700 rounded-full p-0.5"><Star size={10} className="fill-white text-white"/></div> 4.8
        </span>
        <span className="text-[10px] text-gray-500 mt-1.5 font-medium border-b border-dashed border-gray-300 pb-0.5">By 10K+</span>
      </div>
    </div>
  </div>
}

function Welcome({ orderType, setOrderType }: { orderType: OrderType; setOrderType: (type: OrderType) => void; }) { 
  const modes = [
    { type: "delivery" as const, title: "Delivery", copy: "Fresh treats delivered to you", icon: <MapPin size={24} /> }, 
    { type: "pickup" as const, title: "Takeaway", copy: "Pick up your order in person", icon: <ShoppingBag size={24} /> }
  ]; 
  
  return <main className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
    <div className="w-full max-w-md bg-white rounded-[24px] shadow-xl overflow-hidden border border-gray-100">
      <div className="bg-[#ef4f5f] p-10 text-center text-white">
        <h1 className="font-extrabold text-5xl tracking-tight mb-2">pabbas</h1>
        <p className="text-white/90 text-sm font-medium">Delicious desserts since 1969</p>
      </div>
      <div className="p-6">
        <h2 className="text-[22px] font-extrabold text-gray-900 mb-6 text-center">Select Order Type</h2>
        <div className="flex flex-col gap-3">
          {modes.map((mode) => (
            <button key={mode.type} onClick={() => setOrderType(mode.type)} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 hover:border-[#ef4f5f] hover:shadow-md transition text-left bg-white group">
              <div className="bg-[#fff0f1] text-[#ef4f5f] p-3.5 rounded-2xl group-hover:bg-[#ef4f5f] group-hover:text-white transition">{mode.icon}</div>
              <div className="flex-1">
                <strong className="block text-gray-900 text-[17px] font-bold">{mode.title}</strong>
                <span className="text-gray-500 text-[13px] font-medium">{mode.copy}</span>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-[#ef4f5f]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  </main> 
}

function ProductCard({ item, quantity, onAdd, onChange, onDetails }: { item: MenuItem; quantity: number; onAdd: (item: MenuItem, amount?: number) => void; onChange: (id: string, delta: number) => void; onDetails: (item: MenuItem) => void; }) { 
  return <article onClick={() => item.options ? onDetails(item) : null} className={`flex gap-4 bg-white w-full py-5 px-4 border-b border-gray-100 ${item.options ? 'cursor-pointer' : ''} hover:bg-gray-50/50 transition duration-300`}>
    <div className="flex-1 min-w-0 pr-2 pt-1">
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`w-4 h-4 border-[1.5px] flex items-center justify-center rounded-[3px] ${item.vegetarian ? 'border-green-600' : 'border-red-700'}`}>
          <span className={`w-2 h-2 rounded-full ${item.vegetarian ? 'bg-green-600' : 'bg-red-700'}`}></span>
        </span>
        {item.badge && <span className="bg-[#fff0f1] text-[#ef4f5f] px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border border-[#ffc9ce]">{item.badge}</span>}
      </div>
      <h3 className="font-extrabold text-gray-900 text-[18px] leading-tight mb-2 tracking-tight">{item.name}</h3>
      <div className="flex items-center gap-2 mb-2.5">
         <span className="font-extrabold text-gray-900 text-[16px]">{money(item.price)}</span>
         {item.price > 150 && <span className="text-gray-400 text-[13px] line-through font-medium">{money(item.price + 100)}</span>}
      </div>
      {item.description && <p className="text-gray-500 text-[13px] line-clamp-2 leading-[1.5] font-medium">{item.description}</p>}
    </div>
    
    <div className="relative w-[140px] shrink-0 flex flex-col items-center justify-center pb-3">
      <div className="w-[140px] h-[140px] rounded-[24px] overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-gray-100">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover transform hover:scale-105 transition duration-500" />
      </div>
      
      <div className="absolute -bottom-1 w-[120px] z-10">
        {quantity > 0 ? (
          <div className="flex items-center justify-between bg-[#ef4f5f] text-white rounded-xl h-[40px] shadow-lg shadow-red-500/30 px-3 font-bold" onClick={e => e.stopPropagation()}>
            <button onClick={() => onChange(item.id, -1)} className="p-1 h-full flex items-center active:scale-90 transition"><Minus size={18} strokeWidth={3} /></button>
            <span className="text-[16px]">{quantity}</span>
            <button onClick={() => onChange(item.id, 1)} className="p-1 h-full flex items-center active:scale-90 transition"><Plus size={18} strokeWidth={3} /></button>
          </div>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); item.options ? onDetails(item) : onAdd(item); }} className="w-full bg-white text-[#ef4f5f] border-[1.5px] border-[#ef4f5f] shadow-xl shadow-red-500/10 rounded-xl h-[40px] font-extrabold text-[16px] tracking-wide flex justify-center items-center gap-1 hover:bg-[#fff0f1] active:scale-95 transition-all">
            ADD <Plus size={16} strokeWidth={3} />
          </button>
        )}
      </div>
    </div>
  </article> 
}

function CartPanel({ cart, activeOrderItems, subtotal, deliveryFee, total, onChange, onCheckout }: { cart: CartItem[]; activeOrderItems?: any[]; subtotal: number; deliveryFee: number; total: number; onChange: (id: string, delta: number) => void; onCheckout: () => void }) { 
  return <div className="bg-white rounded-[20px] p-5">
    {cart.length === 0 && (!activeOrderItems || activeOrderItems.length === 0) ? (
      <div className="text-center py-8 text-gray-500">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <ShoppingBag size={24} className="text-gray-300" />
        </div>
        <p className="font-medium text-gray-600">Your cart is empty</p>
      </div>
    ) : (
      <>
        <div className="flex flex-col gap-5 max-h-[350px] overflow-auto mb-4">
          {activeOrderItems && activeOrderItems.length > 0 && (
            <div className="mb-2">
              <h4 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-3">Already Ordered</h4>
              <div className="flex flex-col gap-4">
                {activeOrderItems.map((item, idx) => (
                  <div className="flex items-start gap-3 opacity-60" key={`active-${idx}`}>
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <strong className="text-[15px] text-gray-800 leading-tight">{item.item_name} {item.variant_name ? `(${item.variant_name})` : ''}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[14px] font-bold text-gray-500">{item.quantity}x</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cart.length > 0 && (
            <div>
              {activeOrderItems && activeOrderItems.length > 0 && (
                <h4 className="text-[12px] font-bold text-[#ef4f5f] uppercase tracking-wider mb-3 mt-4 border-t border-dashed border-gray-200 pt-4">New Additions</h4>
              )}
              <div className="flex flex-col gap-4">
                {cart.map((line) => (
                  <div className="flex items-start gap-3" key={line.item.id}>
              <div className="flex-1">
                <div className="flex items-start gap-2">
                  <span className={`shrink-0 mt-1 w-3.5 h-3.5 border-[1.5px] flex items-center justify-center rounded-[2px] ${line.item.vegetarian ? 'border-green-600' : 'border-red-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${line.item.vegetarian ? 'bg-green-600' : 'bg-red-700'}`}></span>
                  </span>
                  <strong className="text-[15px] text-gray-800 leading-tight">{line.item.name}</strong>
                </div>
                <div className="text-gray-600 text-[13px] font-medium mt-1 ml-5">{money(line.item.price)}</div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center justify-between bg-[#fff0f1] text-[#ef4f5f] border border-[#ffc9ce] rounded-[8px] shrink-0 w-20 h-8">
                  <button onClick={() => onChange(line.item.id, -1)} className="px-2 h-full flex items-center justify-center"><Minus size={14} strokeWidth={2.5}/></button>
                  <span className="text-[14px] font-bold">{line.quantity}</span>
                  <button onClick={() => onChange(line.item.id, 1)} className="px-2 h-full flex items-center justify-center"><Plus size={14} strokeWidth={2.5}/></button>
                </div>
                <span className="text-[14px] font-bold text-gray-800">{money(line.item.price * line.quantity)}</span>
              </div>
            </div>
          ))}
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-dashed border-gray-200 pt-4 text-[14px] flex flex-col gap-2.5">
          <div className="flex justify-between text-gray-600 font-medium"><span>Item Total</span><span>{money(subtotal)}</span></div>
          {deliveryFee > 0 && <div className="flex justify-between text-gray-600 font-medium"><span>Delivery Partner Fee</span><span>{money(deliveryFee)}</span></div>}
          <div className="flex justify-between font-bold text-gray-900 text-[17px] mt-2 border-t border-gray-100 pt-3"><span>To Pay</span><span>{money(total)}</span></div>
        </div>
        {cart.length > 0 && (
          <button onClick={onCheckout} className="w-full bg-[#e23744] text-white rounded-[14px] py-3.5 font-bold text-[16px] mt-6 active:scale-[0.98] transition shadow-md shadow-red-500/20">Proceed to Checkout</button>
        )}
      </>
    )}
  </div> 
}

function ProductDetails({ item, onClose, onAdd }: { item: MenuItem; onClose: () => void; onAdd: (item: MenuItem, amount?: number) => void }) { 
  const [quantity, setQuantity] = useState(1); 
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-5">
    <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden relative pb-4">
      <button onClick={onClose} aria-label="Close details" className="absolute right-4 top-4 z-10 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur"><X size={16} /></button>
      <img src={item.image} alt={item.name} className="w-full h-64 object-cover" />
      <div className="p-6">
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`w-4 h-4 border-[1.5px] flex items-center justify-center rounded-[2px] ${item.vegetarian ? 'border-green-600' : 'border-red-700'}`}>
            <span className={`w-2 h-2 rounded-full ${item.vegetarian ? 'bg-green-600' : 'bg-red-700'}`}></span>
          </span>
          <p className="text-xs font-bold text-gray-500 uppercase">{item.category}</p>
        </div>
        <h2 className="text-[22px] font-extrabold text-gray-900 leading-tight">{item.name}</h2>
        <p className="mt-2 text-[14px] text-gray-500 leading-[1.5]">{item.description}</p>
        
        <div className="mt-6 pt-6 border-t border-gray-100">
           <div className="flex items-center justify-between mb-4">
             <span className="text-[20px] font-extrabold">{money(item.price * quantity)}</span>
             <div className="flex items-center justify-between bg-[#fff0f1] text-[#ef4f5f] border border-[#ffc9ce] rounded-[10px] w-[100px] h-[38px] px-1 font-bold">
               <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 h-full flex items-center justify-center"><Minus size={16} strokeWidth={3}/></button>
               <span className="text-[16px]">{quantity}</span>
               <button onClick={() => setQuantity(quantity + 1)} className="p-2 h-full flex items-center justify-center"><Plus size={16} strokeWidth={3}/></button>
             </div>
           </div>
           <button onClick={() => onAdd(item, quantity)} className="w-full bg-[#ef4f5f] text-white rounded-[14px] py-[14px] font-bold text-[16px] shadow-md shadow-red-500/20 active:scale-[0.98] transition">Add item</button>
        </div>
      </div>
    </motion.div>
  </div> 
}

function Checkout({
  activeOrderItems,
  orderType,
  table,
  setTable,
  tables,
  selectedTableId,
  setSelectedTableId,
  partySize,
  setPartySize,
  isAsap,
  setIsAsap,
  cart,
  total,
  details,
  setDetails,
  isSubmitting,
  submitError,
  onBack,
  onPlace
}: {
  activeOrderItems?: any[];
  orderType: OrderType;
  table: string;
  setTable: (table: string) => void;
  tables: import("@/lib/supabase/types").RestaurantTableRow[];
  selectedTableId: string;
  setSelectedTableId: (id: string) => void;
  partySize: number;
  setPartySize: (size: number) => void;
  isAsap: boolean;
  setIsAsap: (asap: boolean) => void;
  cart: CartItem[];
  total: number;
  details: CustomerDetails;
  setDetails: (details: CustomerDetails | ((prev: CustomerDetails) => CustomerDetails)) => void;
  isSubmitting: boolean;
  submitError: string;
  onBack: () => void;
  onPlace: () => void;
}) { 
  const { user, signOut } = useAuth();

  const [addresses, setAddresses] = useState<import("@/lib/supabase/types").CustomerAddressRow[]>([]);
  const [fetchingAddresses, setFetchingAddresses] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({ label: '', address: '', landmark: '', pincode: '', is_default: false });
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const fetchAddresses = async () => {
    setFetchingAddresses(true);
    try {
      const res = await fetch('/api/customer/addresses');
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses);
        if (data.addresses.length > 0) {
          const defaultAddr = data.addresses.find((a: any) => a.is_default) || data.addresses[0];
          setDetails((prev: CustomerDetails) => ({
            ...prev,
            address: prev.address || defaultAddr.address,
            landmark: prev.landmark || defaultAddr.landmark || '',
            pincode: prev.pincode || defaultAddr.pincode || '',
          }));
        }
      }
    } finally {
      setFetchingAddresses(false);
    }
  };

  useEffect(() => {
    if (user) {
      setDetails((prev) => ({
        ...prev,
        name: prev.name || user.name || "",
        phone: prev.phone || user.phone || "",
      }));
      fetchAddresses();
    }
  }, [user]);

  const handleSaveAddress = async () => {
    try {
      const isNew = addresses.length === 0;
      const body = isNew ? { address: details.address, landmark: details.landmark, pincode: details.pincode, is_default: true } : addressForm;
      if (!body.address) return;
      
      if (editingAddressId && !isNew) {
        await fetch(`/api/customer/addresses/${editingAddressId}`, {
          method: 'PATCH',
          body: JSON.stringify(body)
        });
      } else {
        await fetch('/api/customer/addresses', {
          method: 'POST',
          body: JSON.stringify(body)
        });
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm({ label: '', address: '', landmark: '', pincode: '', is_default: false });
      await fetchAddresses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await fetch(`/api/customer/addresses/${id}`, { method: 'DELETE' });
      await fetchAddresses();
    } catch (err) {
      console.error(err);
    }
  };

  const selectAddress = (addr: import("@/lib/supabase/types").CustomerAddressRow) => {
    setDetails((prev: CustomerDetails) => ({ ...prev, address: addr.address, landmark: addr.landmark || '', pincode: addr.pincode || '' }));
  };

  return <main className="min-h-screen bg-gray-50 pt-4 pb-20 px-4">
    <div className="max-w-[768px] mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-gray-800 mb-6 font-semibold"><ChevronLeft size={22} /> Back</button>
      <div className="grid gap-6">
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h1 className="text-2xl font-extrabold mb-6 text-gray-900">Complete Order</h1>
          
          {user ? (
            <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50/60 border border-green-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                  <Check size={20} strokeWidth={3} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-extrabold text-gray-900">
                      {user.name ? `Welcome, ${user.name}!` : "Welcome!"}
                    </span>
                  </div>
                  {user.phone && (
                    <p className="text-xs text-gray-600 font-medium mt-0.5">
                      {user.phone}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                className="text-xs font-semibold text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-red-200 transition shadow-xs flex items-center gap-1.5"
              >
                <LogOut size={13} />
                Sign Out
              </button>
            </div>
          ) : null}

          <div className="mb-8">
            {(!activeOrderItems || activeOrderItems.length === 0) && (
              <>
                <h2 className="text-[17px] font-bold mb-4 text-gray-800">Contact Details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input className="checkout-input bg-gray-50" placeholder="Full name" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
                  {user ? (
                    <div className="bg-gray-100 border border-gray-200 rounded-xl p-3 flex flex-col justify-center gap-1 opacity-80 cursor-not-allowed">
                      <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wide">WhatsApp Number</span>
                      <span className="text-gray-900 font-semibold text-[15px] leading-tight">{details.phone || "Not linked"}</span>
                      <span className="text-[11px] text-green-700 font-semibold flex items-center gap-1 mt-0.5">🔒 Linked to WhatsApp</span>
                    </div>
                  ) : (
                    <input className="checkout-input bg-gray-50" placeholder="WhatsApp Number" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} />
                  )}
                </div>
              </>
            )}

            {orderType === "delivery" && <>
              <h2 className="text-[17px] font-bold mt-8 mb-4 text-gray-800">Delivery Address</h2>
              
              {fetchingAddresses ? (
                <div className="text-gray-500 text-sm">Loading addresses...</div>
              ) : addresses.length === 0 || showAddressForm ? (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  {(addresses.length > 0 || showAddressForm) && (
                    <div className="mb-3">
                      <label className="text-xs text-gray-500 font-bold uppercase tracking-wide ml-1">Label (Optional)</label>
                      <input className="checkout-input bg-white w-full mt-1" placeholder="e.g. Home, Work" value={addressForm.label} onChange={(e) => setAddressForm({...addressForm, label: e.target.value})} />
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="text-xs text-gray-500 font-bold uppercase tracking-wide ml-1">Address</label>
                    <input className="checkout-input bg-white w-full mt-1" placeholder="Flat, building, street address" value={addresses.length === 0 ? details.address : addressForm.address} onChange={(e) => addresses.length === 0 ? setDetails({...details, address: e.target.value}) : setAddressForm({...addressForm, address: e.target.value})} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 mb-4">
                    <div>
                      <label className="text-xs text-gray-500 font-bold uppercase tracking-wide ml-1">Landmark</label>
                      <input className="checkout-input bg-white w-full mt-1" placeholder="Landmark" value={addresses.length === 0 ? details.landmark : addressForm.landmark} onChange={(e) => addresses.length === 0 ? setDetails({...details, landmark: e.target.value}) : setAddressForm({...addressForm, landmark: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-bold uppercase tracking-wide ml-1">Pincode</label>
                      <input className="checkout-input bg-white w-full mt-1" placeholder="Pincode" value={addresses.length === 0 ? details.pincode : addressForm.pincode} onChange={(e) => addresses.length === 0 ? setDetails({...details, pincode: e.target.value}) : setAddressForm({...addressForm, pincode: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    {addresses.length > 0 && <button onClick={() => { setShowAddressForm(false); setEditingAddressId(null); }} className="text-gray-500 font-semibold text-[14px]">Cancel</button>}
                    <button onClick={handleSaveAddress} className={`bg-[#ef4f5f] text-white px-5 py-2.5 rounded-xl font-bold text-[14px] shadow-md shadow-red-500/20 active:scale-95 transition ${addresses.length === 0 ? 'w-full' : ''}`}>Save Address</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {addresses.map(addr => {
                    const isSelected = details.address === addr.address && details.pincode === (addr.pincode || '');
                    return (
                      <div key={addr.id} onClick={() => selectAddress(addr)} className={`border-2 rounded-2xl p-4 cursor-pointer transition ${isSelected ? 'border-green-600 bg-green-50/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-[15px]">{addr.label || 'Saved Address'}</span>
                            {addr.is_default && <span className="bg-gray-100 text-gray-600 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md">Default</span>}
                          </div>
                          {isSelected && <Check size={18} strokeWidth={3} className="text-green-600" />}
                        </div>
                        <p className="text-gray-600 text-[14px] leading-tight mt-1">{addr.address}</p>
                        <p className="text-gray-500 text-[13px] mt-0.5">{[addr.landmark, addr.pincode].filter(Boolean).join(', ')}</p>
                        
                        {isSelected && (
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200/60">
                            <button onClick={(e) => {
                              e.stopPropagation();
                              setAddressForm({ label: addr.label || '', address: addr.address, landmark: addr.landmark || '', pincode: addr.pincode || '', is_default: addr.is_default });
                              setEditingAddressId(addr.id);
                              setShowAddressForm(true);
                            }} className="text-gray-500 hover:text-gray-800 text-[13px] font-semibold">Edit</button>
                            <button onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAddress(addr.id);
                            }} className="text-red-500 hover:text-red-700 text-[13px] font-semibold">Delete</button>
                            {!addr.is_default && (
                              <button onClick={async (e) => {
                                e.stopPropagation();
                                await fetch(`/api/customer/addresses/${addr.id}`, { method: 'PATCH', body: JSON.stringify({ is_default: true }) });
                                await fetchAddresses();
                              }} className="text-gray-500 hover:text-gray-800 text-[13px] font-semibold ml-auto">Set Default</button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <button onClick={() => {
                    setAddressForm({ label: '', address: '', landmark: '', pincode: '', is_default: false });
                    setEditingAddressId(null);
                    setShowAddressForm(true);
                  }} className="mt-1 text-[#ef4f5f] font-bold text-[14px] border-2 border-dashed border-[#ffc9ce] rounded-xl p-3 flex items-center justify-center gap-2 hover:bg-[#fff0f1] transition">
                    <Plus size={16} strokeWidth={2.5}/> Add new address
                  </button>
                </div>
              )}
            </>}

            {orderType === "pickup" && (
              <>
                <h2 className="text-[17px] font-bold mt-8 mb-4 text-gray-800">Pickup Details</h2>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 text-[15px] font-medium text-gray-800 cursor-pointer">
                    <input type="radio" name="pickupTime" checked={isAsap} onChange={() => setIsAsap(true)} className="w-4 h-4 text-[#ef4f5f] accent-[#ef4f5f]" />
                    ASAP
                  </label>
                  <label className="flex items-center gap-2 text-[15px] font-medium text-gray-800 cursor-pointer">
                    <input type="radio" name="pickupTime" checked={!isAsap} onChange={() => setIsAsap(false)} className="w-4 h-4 text-[#ef4f5f] accent-[#ef4f5f]" />
                    Schedule Later
                  </label>
                </div>
                {!isAsap && (
                  <div className="grid gap-4 sm:grid-cols-2 mt-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500 font-medium ml-1">Date</label>
                      <input className="checkout-input bg-gray-50" type="date" value={details.pickupDate} onChange={(e) => setDetails({ ...details, pickupDate: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500 font-medium ml-1">Time</label>
                      <input className="checkout-input bg-gray-50" type="time" value={details.pickupTime} onChange={(e) => setDetails({ ...details, pickupTime: e.target.value })} />
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
          
          <div>
            <h2 className="text-[17px] font-bold mb-4 text-gray-800">Payment Method</h2>
            <div className="grid grid-cols-3 gap-3">
              {(["upi", "cash", "online"] as PaymentMethod[]).map((method) => 
                <button key={method} disabled={method !== "cash"} onClick={() => setDetails({ ...details, payment: method })} className={`relative flex flex-col items-center justify-center p-3.5 rounded-xl border-2 font-bold text-[14px] transition ${details.payment === method ? "border-[#ef4f5f] text-[#ef4f5f] bg-[#fff0f1]" : "border-gray-100 text-gray-600 bg-gray-50"} ${method !== "cash" ? "opacity-50 cursor-not-allowed" : ""}`}>
                  {method === "upi" ? "UPI" : method === "cash" ? "Cash" : "Card"}
                  {method !== "cash" && <span className="absolute -top-2.5 bg-gray-200 text-gray-600 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border border-white">Coming Soon</span>}
                </button>
              )}
            </div>
          </div>
        </section>
        
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-[17px] font-bold mb-4 text-gray-800">Order Summary</h2>
          <div className="flex flex-col gap-3.5 mb-5">
            {activeOrderItems && activeOrderItems.length > 0 && (
              <div className="mb-2">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Already Ordered</h4>
                {activeOrderItems.map((item, idx) => (
                  <div className="flex justify-between text-[14px] text-gray-500 opacity-70" key={`active-${idx}`}>
                    <span className="font-medium">{item.quantity} × {item.item_name} {item.variant_name ? `(${item.variant_name})` : ''}</span>
                  </div>
                ))}
                <h4 className="text-[11px] font-bold text-[#ef4f5f] uppercase tracking-wider mt-4 mb-2 border-t border-dashed border-gray-200 pt-3">New Additions</h4>
              </div>
            )}
            {cart.map((line) => <div className="flex justify-between text-[14px]" key={line.item.id}><span className="text-gray-700 font-medium">{line.quantity} × {line.item.name}</span><strong className="text-gray-900">{money(line.item.price * line.quantity)}</strong></div>)}
          </div>
          <div className="border-t border-dashed border-gray-200 pt-4">
            <div className="flex justify-between font-extrabold text-[18px] text-gray-900"><span>Grand Total</span><span>{money(total)}</span></div>
          </div>

          {submitError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
              ⚠️ {submitError}
            </div>
          )}

          <button
            onClick={onPlace}
            disabled={isSubmitting || ((!activeOrderItems || activeOrderItems.length === 0) && (!details.name || !details.phone)) || (orderType === "delivery" && !details.address)}
            className="w-full bg-[#e23744] text-white font-bold text-[16px] py-[15px] rounded-[14px] mt-6 disabled:opacity-50 shadow-md shadow-red-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Placing Order...
              </>
            ) : (
              'Place Order'
            )}
          </button>
          <p className="text-center text-[12px] text-gray-400 mt-4 font-medium">Payment is simulated in this preview.</p>
        </section>
      </div>
    </div>
  </main> 
}


function Confirmation({ orderNumber, orderType, table, cart, total, onContinue }: { orderNumber: string; orderType: OrderType; table: string; cart: CartItem[]; total: number; onContinue: () => void }) { 
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const handleCancel = async () => {
    const reason = window.prompt('Please provide a reason for cancellation:');
    if (!reason) return;
    
    setCancelling(true);
    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber, cancel_reason: reason })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to cancel');
      setCancelled(true);
    } catch (err: any) {
      setCancelError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (cancelled) {
    return <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[24px] p-8 shadow-xl text-center border border-gray-100">
        <div className="w-[84px] h-[84px] bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <X size={44} strokeWidth={3} />
        </div>
        <h1 className="text-[26px] font-extrabold mb-2 text-gray-900">Order Cancelled</h1>
        <p className="text-gray-500 mb-6 font-medium">Your order has been successfully cancelled.</p>
        <button onClick={onContinue} className="w-full bg-[#ef4f5f] text-white font-bold py-[15px] rounded-[14px] shadow-md shadow-red-500/20 active:scale-[0.98] transition">Back to Home</button>
      </div>
    </main>;
  }

  return <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-[24px] p-8 shadow-xl text-center border border-gray-100">
      <div className="w-[84px] h-[84px] bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check size={44} strokeWidth={3} />
      </div>
      <h1 className="text-[26px] font-extrabold mb-2 text-gray-900">Order Confirmed!</h1>
      <p className="text-gray-500 mb-6 font-medium">Your request has been received.</p>
      
      <div className="flex items-center justify-center gap-2 mb-8 text-[#25D366] bg-[#25D366]/10 px-4 py-2 rounded-full mx-auto w-max text-[13px] font-semibold border border-[#25D366]/20 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
        WhatsApp confirmation prepared
      </div>
      
      <div className="bg-gray-50 rounded-[16px] p-5 mb-8 text-left border border-gray-100">
        <div className="flex justify-between mb-3">
          <span className="text-gray-500 text-[14px] font-medium">Order Number</span>
          <strong className="font-bold text-gray-900">{orderNumber}</strong>
        </div>
        <div className="flex justify-between mb-3">
          <span className="text-gray-500 text-[14px] font-medium">Order Type</span>
          <strong className="font-bold text-gray-900 capitalize">{orderType}</strong>
        </div>
        <div className="flex justify-between border-t border-dashed border-gray-200 pt-3 mt-1">
          <span className="text-gray-500 text-[14px] font-medium">Amount Paid</span>
          <strong className="font-extrabold text-gray-900 text-[16px]">{money(total)}</strong>
        </div>
      </div>
      
      {cancelError && <p className="text-red-500 text-sm mb-4">{cancelError}</p>}
      <div className="flex flex-col gap-3">
        <button onClick={onContinue} className="w-full bg-[#ef4f5f] text-white font-bold py-[15px] rounded-[14px] shadow-md shadow-red-500/20 active:scale-[0.98] transition">Back to Home</button>
        <button disabled={cancelling} onClick={handleCancel} className="w-full bg-white text-red-500 border border-red-200 font-bold py-[15px] rounded-[14px] active:scale-[0.98] transition">{cancelling ? 'Cancelling...' : 'Cancel Order'}</button>
      </div>
    </div>
  </main> 
}
