const formatKES = (n) => `KES ${Number(n).toLocaleString("en-KE")}`;

export default function ProductCard({ product }) {
  return (
    <article className="card">
      <span className="badge">{product.category}</span>
      <h3>{product.name}</h3>
      {product.description && <p className="desc">{product.description}</p>}
      <p className="price">{formatKES(product.price)}</p>
    </article>
  );
}
