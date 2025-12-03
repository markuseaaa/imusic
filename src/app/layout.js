import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata = {
  title: "iMusic K-POP",
  description: "iMusic K-POP prototype",
};

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <body>
        <Navbar />
        <main className="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
