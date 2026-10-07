import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import PaginatedProducts from "./pages/PaginatedProducts.jsx";
import InfiniteProducts from "./pages/InfiniteProducts.jsx";

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>Product Catalogue</h1>
        <nav className="nav">
          <NavLink to="/products" end>
            Pagination
          </NavLink>
          <NavLink to="/products/scroll">Infinite scroll</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/products" element={<PaginatedProducts />} />
          <Route path="/products/scroll" element={<InfiniteProducts />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}
