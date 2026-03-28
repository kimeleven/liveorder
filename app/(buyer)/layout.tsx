export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto bg-white min-h-screen lg:min-h-[700px] lg:max-h-[800px] lg:rounded-2xl lg:shadow-xl flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
