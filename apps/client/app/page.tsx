import Footer from "../components/Footer";
import Header from "../components/Header";
import SearchClient from "../components/SearchClient";

export default function HomePage() {
  return (
    <main>
      <div className="container">
        <Header />

        <SearchClient />
        <Footer />
      </div>
    </main>
  );
}
