import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { ProductRow, type ProductDto } from "../components/ProductRow";
export function Products() {
  const q = useQuery({ queryKey: ["products"], queryFn: () => api<ProductDto[]>("/products") });
  if (q.isPending) return <p role="status">Loading products…</p>;
  if (q.isError) return <div role="alert"><p>{q.error.message}</p><button className="btn ghost" onClick={() => q.refetch()}>Try again</button></div>;
  if (q.data.length === 0) return <p>No products are available right now. Please check back soon.</p>;
  return (<><h1>Products</h1><ul className="plist">{q.data.map((p) => <ProductRow key={p.id} p={p} onAdd={() => { /* TODO patch 0003: cart */ }} />)}</ul></>);
}
