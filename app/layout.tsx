import { Providers } from "./providers";
import './globals.css';
import '../lib/font.css'; 

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={` antialiased`}
        style={{ backgroundColor: "#ffffff", color: "black" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}