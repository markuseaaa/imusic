import "./globals.css";
import Navbar from "../components/Navbar";

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
      </body>
    </html>
  );
}
