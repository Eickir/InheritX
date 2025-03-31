import Footer from "./Footer";
import Header from "./Header";

export const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow pb-16">
        {children}
      </main>
      <Footer />
    </div>
  );
};
