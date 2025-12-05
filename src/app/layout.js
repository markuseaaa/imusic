import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CartProviderClient from "../components/CartProviderClient";

export const metadata = {
  title: "iMusic K-POP",
  description: "iMusic K-POP prototype",
};

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <body>
        <CartProviderClient>
          <Navbar />
          <main className="main">{children}</main>
          <Footer />
        </CartProviderClient>
      </body>
    </html>
  );
}
