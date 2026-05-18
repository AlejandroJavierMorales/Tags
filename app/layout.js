
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/tags_global.css";


export const metadata = {
  title: "Tags",
  description: "App de QR dinámicos",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <div className="app_container">
          {children}
        </div>
      </body>
    </html>
  );
}