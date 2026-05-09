import AdminLayoutShell from "@/components/AdminLayoutShell";

export const metadata = {
  title: "KnotBook Admin",
  description: "KnotBook administration panel",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
