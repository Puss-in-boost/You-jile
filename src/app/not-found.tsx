import Link from "next/link";
export default function NotFound() {
  return (
    <main
      className="empty-state"
      style={{ minHeight: "90vh", justifyContent: "center" }}
    >
      <h1>这一页，走丢了。</h1>
      <p>账本还在，回去继续记录生活吧。</p>
      <Link className="primary" href="/">
        回到账本
      </Link>
    </main>
  );
}
