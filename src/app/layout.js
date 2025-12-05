import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CartProviderClient from "../components/CartProviderClient";

export const metadata = {
  title: "iMusic K-POP",
  description: "Find og køb dit yndlings K-POP merchandise her!",
  icons: {
    icon: "icons/favicon.png",
    apple: "icons/favicon.png",
    shortcut: "icons/favicon.png",
  },
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
