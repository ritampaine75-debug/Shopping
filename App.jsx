import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { loginUser, registerUser, logoutUser, getUserData } from './services/auth';
import { watchProducts, watchCart, addToCart, removeFromCart, placeOrder, watchUserOrders, watchAllOrders, updateOrderStatus, addProduct, deleteProduct } from './services/db';
import { uploadImage } from './services/imgbb';
import './theme/theme.css';
import './App.css';

const AuthContext = createContext();

// --- COMPONENTS ---

const TopBar = ({ title, showCart = true, cartCount = 0 }) => (
  <header className="top-bar">
    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{title}</h2>
    {showCart && (
      <Link to="/cart" style={{ color: 'white', position: 'relative' }}>
        <i className="fa-solid fa-cart-shopping"></i>
        {cartCount > 0 && <span style={{ position: 'absolute', top: -8, right: -10, background: 'red', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>{cartCount}</span>}
      </Link>
    )}
  </header>
);

const BottomNav = ({ isAdmin }) => (
  <nav className="bottom-nav">
    <Link to="/" className="nav-item"><i className="fa-solid fa-house"></i>Home</Link>
    {!isAdmin && <Link to="/cart" className="nav-item"><i className="fa-solid fa-cart-shopping"></i>Cart</Link>}
    {!isAdmin && <Link to="/orders" className="nav-item"><i className="fa-solid fa-bag-shopping"></i>Orders</Link>}
    {isAdmin && <Link to="/admin" className="nav-item"><i className="fa-solid fa-lock"></i>Admin</Link>}
    <button onClick={() => logoutUser()} className="nav-item" style={{ background: 'none' }}><i className="fa-solid fa-right-from-bracket"></i>Exit</button>
  </nav>
);

// --- PAGES ---

const Home = () => {
  const [products, setProducts] = useState({});
  useEffect(() => watchProducts(setProducts), []);

  return (
    <div className="safe-area">
      <TopBar title="DroidShop" />
      <div className="product-grid">
        {Object.entries(products || {}).map(([id, p]) => (
          <Link to={`/product/${id}`} key={id} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <img src={p.image} alt={p.name} />
            <div className="card-body">
              <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{p.name}</div>
              <div className="price">${p.price}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const ProductDetails = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState({});
  const navigate = useNavigate();

  useEffect(() => watchProducts(setProducts), []);
  const product = products[id];

  const handleAdd = async () => {
    if (!user) return navigate('/login');
    await addToCart(user.uid, { ...product, id });
    alert("Added to cart!");
  };

  if (!product) return <p>Loading...</p>;

  return (
    <div className="safe-area">
      <TopBar title="Details" />
      <img src={product.image} style={{ width: '100%' }} />
      <div style={{ padding: 20 }}>
        <h1>{product.name}</h1>
        <h2 className="price">${product.price}</h2>
        <p>{product.description}</p>
        <button onClick={handleAdd} className="btn-primary" style={{ marginTop: 20 }}>ADD TO CART</button>
      </div>
    </div>
  );
};

const Cart = () => {
  const { user } = useContext(AuthContext);
  const [cartItems, setCartItems] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    if (user) return watchCart(user.uid, setCartItems);
  }, [user]);

  const total = Object.values(cartItems || {}).reduce((acc, curr) => acc + Number(curr.price), 0);

  const handleCheckout = async () => {
    if (total === 0) return;
    await placeOrder(user.uid, { items: cartItems, total });
    alert("Order placed successfully!");
    navigate('/orders');
  };

  return (
    <div className="safe-area">
      <TopBar title="My Cart" showCart={false} />
      <div style={{ padding: 15 }}>
        {Object.entries(cartItems || {}).map(([id, item]) => (
          <div key={id} className="card" style={{ display: 'flex', marginBottom: 10, padding: 10 }}>
            <img src={item.image} style={{ width: 60, height: 60, borderRadius: 8 }} />
            <div style={{ marginLeft: 15, flex: 1 }}>
              <div>{item.name}</div>
              <div className="price">${item.price}</div>
            </div>
            <button onClick={() => removeFromCart(user.uid, id)} style={{ background: '#ffeded', color: 'red', padding: '0 10px' }}>
              <i className="fa-solid fa-trash"></i>
            </button>
          </div>
        ))}
        {total > 0 ? (
          <div style={{ marginTop: 30 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold' }}>
              <span>Total:</span><span>${total.toFixed(2)}</span>
            </div>
            <button onClick={handleCheckout} className="btn-primary" style={{ marginTop: 20 }}>CHECKOUT NOW</button>
          </div>
        ) : <p>Cart is empty</p>}
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState({});
  const [orders, setOrders] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    watchProducts(setProducts);
    watchAllOrders(setOrders);
  }, []);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const file = formData.get('image');
    try {
      const imageUrl = await uploadImage(file);
      await addProduct({
        name: formData.get('name'),
        price: formData.get('price'),
        description: formData.get('desc'),
        image: imageUrl
      });
      e.target.reset();
      alert("Product added!");
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  return (
    <div className="safe-area">
      <TopBar title="Admin Dashboard" showCart={false} />
      <div className="admin-tab-container">
        <div className={`admin-tab ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>Inventory</div>
        <div className={`admin-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>Orders</div>
      </div>

      {tab === 'products' ? (
        <div style={{ padding: 15 }}>
          <form onSubmit={handleAddProduct} style={{ background: 'white', padding: 15, borderRadius: 12, marginBottom: 20 }}>
            <h3>Add New Product</h3>
            <input name="name" placeholder="Product Name" required />
            <input name="price" type="number" placeholder="Price" required />
            <textarea name="desc" placeholder="Description" required />
            <input name="image" type="file" accept="image/*" required />
            <button disabled={loading} className="btn-primary" type="submit">
              {loading ? "Uploading..." : "Save Product"}
            </button>
          </form>

          {Object.entries(products || {}).map(([id, p]) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', background: 'white', padding: 10, borderRadius: 10, marginBottom: 5 }}>
              <img src={p.image} width="40" height="40" style={{ objectFit: 'cover' }} />
              <div style={{ marginLeft: 10, flex: 1 }}>{p.name} - ${p.price}</div>
              <button onClick={() => deleteProduct(id)} style={{ color: 'red', background: 'none' }}><i className="fa-solid fa-trash"></i></button>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {Object.entries(orders || {}).map(([id, o]) => (
            <div key={id} className="order-card">
              <div style={{ fontWeight: 'bold' }}>Order #{id.slice(-5)}</div>
              <div>Total: ${o.total}</div>
              <div style={{ color: 'blue' }}>Status: {o.status}</div>
              <select onChange={(e) => updateOrderStatus(id, e.target.value)} value={o.status}>
                <option value="Pending">Pending</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AuthPage = ({ type }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (type === 'register') await registerUser(email, password, name);
      else await loginUser(email, password);
      navigate('/');
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="auth-container">
      <h2>{type === 'register' ? 'Create Account' : 'Welcome Back'}</h2>
      <form onSubmit={handleAuth}>
        {type === 'register' && <input placeholder="Full Name" onChange={e => setName(e.target.value)} required />}
        <input placeholder="Email" type="email" onChange={e => setEmail(e.target.value)} required />
        <input placeholder="Password" type="password" onChange={e => setPassword(e.target.value)} required />
        <button className="btn-primary" type="submit" style={{ marginTop: 20 }}>
          {type === 'register' ? 'SIGN UP' : 'LOGIN'}
        </button>
      </form>
      <Link to={type === 'register' ? '/login' : '/register'} style={{ display: 'block', marginTop: 20, color: 'var(--primary)' }}>
        {type === 'register' ? 'Already have an account? Login' : "New here? Create account"}
      </Link>
    </div>
  );
};

const Orders = () => {
    const { user } = useContext(AuthContext);
    const [orders, setOrders] = useState([]);
    useEffect(() => { if(user) watchUserOrders(user.uid, setOrders); }, [user]);

    return (
        <div className="safe-area">
            <TopBar title="My Orders" showCart={false} />
            {orders.map(o => (
                <div key={o.id} className="order-card">
                    <div><strong>Date:</strong> {new Date(o.timestamp).toLocaleDateString()}</div>
                    <div><strong>Total:</strong> ${o.total}</div>
                    <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Status: {o.status}</div>
                </div>
            ))}
        </div>
    );
};

// --- MAIN APP ---

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const data = await getUserData(u.uid);
        setUserData(data);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, userData }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AuthPage type="login" />} />
          <Route path="/register" element={<AuthPage type="register" />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={user ? <Cart /> : <Navigate to="/login" />} />
          <Route path="/orders" element={user ? <Orders /> : <Navigate to="/login" />} />
          <Route path="/admin" element={userData?.isAdmin ? <AdminPanel /> : <Navigate to="/" />} />
        </Routes>
        <BottomNav isAdmin={userData?.isAdmin} />
      </BrowserRouter>
    </AuthContext.Provider>
  );
                                     }
