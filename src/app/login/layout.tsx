import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - TEM VENDA",
  description: "Acesso ao sistema TEM VENDA - Mapa Comercial",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
