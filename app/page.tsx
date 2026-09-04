"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, Clock3, MapPin, Minus, Plus, Search, ShoppingBag, Sparkles, Trash2, Utensils, X, Star, Info, ChevronDown, SlidersHorizontal, Bookmark, Share2, Users, MoreVertical, ChevronLeft } from "lucide-react";
import { categories, displayCategory, featuredItems, menuItems } from "@/lib/menu-data";
import { CartItem, CustomerDetails, MenuItem, OrderType, PaymentMethod } from "@/lib/types";
import DeliverySetup from "@/components/DeliverySetup";
import DineInSetup from "@/components/DineInSetup";
import PickupSetup from "@/components/PickupSetup";

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const initialDetails: CustomerDetails = { name: "", phone: "", address: "", landmark: "", pincode: "", pickupDate: "", pickupTime: "19:00", payment: "upi" };

type Screen = "welcome" | "menu" | "checkout" | "confirmed";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [table, setTable] = useState("No table / Takeaway");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [details, setDetails] = useState<CustomerDetails>(initialDetails);
  
  const [deliverySetupOpen, setDeliverySetupOpen] = useState(false);
  const [dineInSetupOpen, setDineInSetupOpen] = useState(false);
  const [pickupSetupOpen, setPickupSetupOpen] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuMenuOpen, setMenuMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  const visibleItems = useMemo(() => menuItems.filter((item) => `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(search.toLowerCase()) && (category === "All" || displayCategory(item.category) === category)), [category, search]);
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
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
  const placeOrder = () => { setOrderNumber(`PB${Math.floor(1000 + Math.random() * 8999)}`); setScreen("confirmed"); setCartOpen(false); };

  if (screen === "welcome") return <>
    <Welcome orderType={orderType} setOrderType={setOrderType} onDeliverySetup={() => setDeliverySetupOpen(true)} onDineInSetup={() => setDineInSetupOpen(true)} onPickupSetup={() => setPickupSetupOpen(true)} />
    {deliverySetupOpen && <DeliverySetup details={details} setDetails={setDetails} onBack={() => setDeliverySetupOpen(false)} onContinue={() => { setDeliverySetupOpen(false); setScreen("menu"); }} />}
    {dineInSetupOpen && <DineInSetup table={table} setTable={setTable} details={details} setDetails={setDetails} onBack={() => setDineInSetupOpen(false)} onContinue={() => { setDineInSetupOpen(false); setScreen("menu"); }} />}
    {pickupSetupOpen && <PickupSetup details={details} setDetails={setDetails} onBack={() => setPickupSetupOpen(false)} onContinue={() => { setPickupSetupOpen(false); setScreen("menu"); }} />}
  </>;

  if (screen === "checkout") return <Checkout orderType={orderType} table={table} cart={cart} total={total} details={details} setDetails={setDetails} onBack={() => setScreen("menu")} onPlace={placeOrder} />;
  if (screen === "confirmed") return <Confirmation orderNumber={orderNumber} orderType={orderType} table={table} cart={cart} total={total} onContinue={() => { setScreen("welcome"); setCart([]); }} />;

  return <div className="min-h-screen bg-gray-50 text-gray-900 pb-[80px]">
    <div className="max-w-[768px] mx-auto bg-white min-h-screen relative shadow-sm">
      <Header search={search} setSearch={setSearch} onBack={() => setScreen("welcome")} />
      
      <RestaurantInfo orderType={orderType} table={table} />

      <nav aria-label="Menu categories" className="sticky top-[64px] z-30 flex gap-3 overflow-x-auto bg-white px-4 py-3 border-b border-gray-100 shadow-[0_2px_4px_rgba(0,0,0,0.02)] no-scrollbar">
        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-[13px] font-medium shrink-0 text-gray-700">
          <SlidersHorizontal size={14}/> Filters <ChevronDown size={14}/>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-[13px] font-medium shrink-0 text-gray-700">
          <span className="w-3.5 h-3.5 border-[1.5px] border-green-600 flex items-center justify-center rounded-[2px]"><span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span></span> Veg
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-[13px] font-medium shrink-0 text-gray-700">
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
          {visibleItems.length === 0 && <div className="py-12 text-center text-gray-500">No dishes found. Try a different search.</div>}
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
            <CartPanel cart={cart} subtotal={subtotal} deliveryFee={deliveryFee} total={total} onChange={changeQuantity} onCheckout={() => {setCartOpen(false); setScreen("checkout");}} />
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
      <Users size={18} className="text-gray-700"/>
    </button>
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
        <p className="text-gray-600 text-[13px] mt-1 flex items-center gap-1 font-medium"><Clock3 size={14} className="text-gray-400"/> 25-30 mins • {orderType === 'dine-in' ? table : (orderType === 'pickup' ? 'Takeaway' : 'Delivery')} <ChevronDown size={14} className="text-gray-400"/></p>
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

function Welcome({ orderType, setOrderType, onDeliverySetup, onDineInSetup, onPickupSetup }: { orderType: OrderType; setOrderType: (type: OrderType) => void; onDeliverySetup: () => void; onDineInSetup: () => void; onPickupSetup: () => void; }) { 
  const modes = [
    { type: "delivery" as const, title: "Delivery", copy: "Fresh treats delivered to you", icon: <MapPin size={24} /> }, 
    { type: "pickup" as const, title: "Takeaway", copy: "Pick up your order in person", icon: <ShoppingBag size={24} /> }, 
    { type: "dine-in" as const, title: "Dine-in", copy: "Enjoy our ambiance and service", icon: <Utensils size={24} /> }
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
            <button key={mode.type} onClick={() => { 
              setOrderType(mode.type); 
              if (mode.type === "delivery") onDeliverySetup(); 
              else if (mode.type === "dine-in") onDineInSetup();
              else if (mode.type === "pickup") onPickupSetup();
            }} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 hover:border-[#ef4f5f] hover:shadow-md transition text-left bg-white group">
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
  return <article className="flex gap-4 bg-white w-full py-5 px-4 border-b border-gray-100 border-dashed">
    <div className="flex-1 min-w-0 pr-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`w-3.5 h-3.5 border-[1.5px] flex items-center justify-center rounded-[2px] ${item.vegetarian ? 'border-green-600' : 'border-red-700'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${item.vegetarian ? 'bg-green-600' : 'bg-red-700'}`}></span>
        </span>
        {item.badge && <span className="text-blue-600 text-[11px] font-bold tracking-wide uppercase">{item.badge}</span>}
      </div>
      <h3 className="font-bold text-gray-800 text-[17px] leading-tight mb-1.5">{item.name}</h3>
      <div className="flex items-center gap-2 mb-2">
         <span className="font-bold text-gray-800 text-[15px]">{money(item.price)}</span>
         {item.price > 150 && <span className="text-gray-400 text-[13px] line-through">{money(item.price + 100)}</span>}
      </div>
      {item.description && <p className="text-gray-500 text-[13px] line-clamp-2 leading-[1.4] mb-3">{item.description}</p>}
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Not eligible for coupons</div>
      
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-full text-gray-500 hover:bg-gray-50"><Bookmark size={15}/></button>
        <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-full text-gray-500 hover:bg-gray-50"><Share2 size={15}/></button>
      </div>
    </div>
    
    <div className="relative w-[140px] shrink-0 flex flex-col items-center">
      <div className="w-[140px] h-[140px] rounded-[18px] overflow-hidden shadow-sm">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
      </div>
      
      <div className="absolute -bottom-[18px] w-[116px]">
        {quantity > 0 ? (
          <div className="flex items-center justify-between bg-[#e23744] text-white border border-[#e23744] rounded-[10px] h-[36px] shadow-sm px-2.5 font-bold">
            <button onClick={() => onChange(item.id, -1)} className="p-1 h-full flex items-center"><Minus size={18} strokeWidth={3} /></button>
            <span className="text-[16px]">{quantity}</span>
            <button onClick={() => onChange(item.id, 1)} className="p-1 h-full flex items-center"><Plus size={18} strokeWidth={3} /></button>
          </div>
        ) : (
          <button onClick={() => item.options ? onDetails(item) : onAdd(item)} className="w-full bg-white text-[#ef4f5f] border-[1px] border-[#ffc9ce] shadow-md shadow-red-500/10 rounded-[10px] h-[36px] font-extrabold text-[15px] tracking-wide flex justify-center items-center gap-1 active:scale-95 transition-transform">
            ADD <Plus size={14} strokeWidth={3} />
          </button>
        )}
      </div>
      <span className="text-[10px] text-gray-400 mt-[22px] text-center w-full block">customisable</span>
    </div>
  </article> 
}

function CartPanel({ cart, subtotal, deliveryFee, total, onChange, onCheckout }: { cart: CartItem[]; subtotal: number; deliveryFee: number; total: number; onChange: (id: string, delta: number) => void; onCheckout: () => void }) { 
  return <div className="bg-white rounded-[20px] p-5">
    {cart.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <ShoppingBag size={24} className="text-gray-300" />
        </div>
        <p className="font-medium text-gray-600">Your cart is empty</p>
      </div>
    ) : (
      <>
        <div className="flex flex-col gap-5 max-h-[350px] overflow-auto mb-4">
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
        <div className="border-t border-dashed border-gray-200 pt-4 text-[14px] flex flex-col gap-2.5">
          <div className="flex justify-between text-gray-600 font-medium"><span>Item Total</span><span>{money(subtotal)}</span></div>
          {deliveryFee > 0 && <div className="flex justify-between text-gray-600 font-medium"><span>Delivery Partner Fee</span><span>{money(deliveryFee)}</span></div>}
          <div className="flex justify-between font-bold text-gray-900 text-[17px] mt-2 border-t border-gray-100 pt-3"><span>To Pay</span><span>{money(total)}</span></div>
        </div>
        <button onClick={onCheckout} className="w-full bg-[#e23744] text-white rounded-[14px] py-3.5 font-bold text-[16px] mt-6 active:scale-[0.98] transition shadow-md shadow-red-500/20">Proceed to Checkout</button>
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

function Checkout({ orderType, table, cart, total, details, setDetails, onBack, onPlace }: { orderType: OrderType; table: string; cart: CartItem[]; total: number; details: CustomerDetails; setDetails: (details: CustomerDetails) => void; onBack: () => void; onPlace: () => void }) { 
  return <main className="min-h-screen bg-gray-50 pt-4 pb-20 px-4">
    <div className="max-w-[768px] mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-gray-800 mb-6 font-semibold"><ChevronLeft size={22} /> Back</button>
      <div className="grid gap-6">
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h1 className="text-2xl font-extrabold mb-6 text-gray-900">Complete Order</h1>
          
          <div className="mb-8">
            <h2 className="text-[17px] font-bold mb-4 text-gray-800">Contact Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className="checkout-input bg-gray-50" placeholder="Full name" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
              <input className="checkout-input bg-gray-50" placeholder="Mobile number" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} />
            </div>
            {orderType === "delivery" && <>
              <input className="checkout-input bg-gray-50 mt-4 w-full" placeholder="Delivery address" value={details.address} onChange={(e) => setDetails({ ...details, address: e.target.value })} />
              <div className="grid gap-4 sm:grid-cols-2 mt-4">
                <input className="checkout-input bg-gray-50" placeholder="Landmark" value={details.landmark} onChange={(e) => setDetails({ ...details, landmark: e.target.value })} />
                <input className="checkout-input bg-gray-50" placeholder="Pincode" value={details.pincode} onChange={(e) => setDetails({ ...details, pincode: e.target.value })} />
              </div>
            </>}
            {orderType === "pickup" && (
              <div className="grid gap-4 sm:grid-cols-2 mt-4">
                <input className="checkout-input bg-gray-50" type="date" value={details.pickupDate} onChange={(e) => setDetails({ ...details, pickupDate: e.target.value })} />
                <input className="checkout-input bg-gray-50" type="time" value={details.pickupTime} onChange={(e) => setDetails({ ...details, pickupTime: e.target.value })} />
              </div>
            )}
            {orderType === "dine-in" && <div className="mt-4 bg-[#fff0f1] border border-[#ffc9ce] text-[#ef4f5f] p-4 rounded-xl flex items-center gap-3"><Utensils size={20} /> <div><strong className="text-gray-900 text-[15px]">Dine-in Reservation</strong><br/><span className="text-gray-700 text-[14px]">{table} | {details.pickupDate} at {details.pickupTime}</span></div></div>}
          </div>
          
          <div>
            <h2 className="text-[17px] font-bold mb-4 text-gray-800">Payment Method</h2>
            <div className="grid grid-cols-3 gap-3">
              {(["upi", "cash", "online"] as PaymentMethod[]).map((method) => 
                <button key={method} onClick={() => setDetails({ ...details, payment: method })} className={`flex items-center justify-center p-3.5 rounded-xl border-2 font-bold text-[14px] transition ${details.payment === method ? "border-[#ef4f5f] text-[#ef4f5f] bg-[#fff0f1]" : "border-gray-100 text-gray-600 bg-gray-50"}`}>
                  {method === "upi" ? "UPI" : method === "cash" ? "Cash" : "Card"}
                </button>
              )}
            </div>
          </div>
        </section>
        
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-[17px] font-bold mb-4 text-gray-800">Order Summary</h2>
          <div className="flex flex-col gap-3.5 mb-5">
            {cart.map((line) => <div className="flex justify-between text-[14px]" key={line.item.id}><span className="text-gray-700 font-medium">{line.quantity} × {line.item.name}</span><strong className="text-gray-900">{money(line.item.price * line.quantity)}</strong></div>)}
          </div>
          <div className="border-t border-dashed border-gray-200 pt-4">
            <div className="flex justify-between font-extrabold text-[18px] text-gray-900"><span>Grand Total</span><span>{money(total)}</span></div>
          </div>
          <button onClick={onPlace} disabled={!details.name || !details.phone || (orderType === "delivery" && !details.address)} className="w-full bg-[#e23744] text-white font-bold text-[16px] py-[15px] rounded-[14px] mt-6 disabled:opacity-50 shadow-md shadow-red-500/20 active:scale-[0.98] transition">Place Order</button>
          <p className="text-center text-[12px] text-gray-400 mt-4 font-medium">Payment is simulated in this preview.</p>
        </section>
      </div>
    </div>
  </main> 
}

function Confirmation({ orderNumber, orderType, table, cart, total, onContinue }: { orderNumber: string; orderType: OrderType; table: string; cart: CartItem[]; total: number; onContinue: () => void }) { 
  return <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-[24px] p-8 shadow-xl text-center border border-gray-100">
      <div className="w-[84px] h-[84px] bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check size={44} strokeWidth={3} />
      </div>
      <h1 className="text-[26px] font-extrabold mb-2 text-gray-900">Order Placed!</h1>
      <p className="text-gray-500 mb-8 font-medium">Your request has been received.</p>
      
      <div className="bg-gray-50 rounded-[16px] p-5 mb-8 text-left border border-gray-100">
        <div className="flex justify-between mb-3">
          <span className="text-gray-500 text-[14px] font-medium">Order Number</span>
          <strong className="font-bold text-gray-900">{orderNumber}</strong>
        </div>
        <div className="flex justify-between mb-3">
          <span className="text-gray-500 text-[14px] font-medium">Order Type</span>
          <strong className="font-bold text-gray-900 capitalize">{orderType === "dine-in" ? table : orderType}</strong>
        </div>
        <div className="flex justify-between border-t border-dashed border-gray-200 pt-3 mt-1">
          <span className="text-gray-500 text-[14px] font-medium">Amount Paid</span>
          <strong className="font-extrabold text-gray-900 text-[16px]">{money(total)}</strong>
        </div>
      </div>
      
      <button onClick={onContinue} className="w-full bg-[#ef4f5f] text-white font-bold py-[15px] rounded-[14px] shadow-md shadow-red-500/20 active:scale-[0.98] transition">Back to Home</button>
    </div>
  </main> 
}
