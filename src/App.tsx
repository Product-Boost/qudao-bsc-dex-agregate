import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Skeleton } from "./components/ui";

const Landing = lazy(() => import("./pages/Landing"));
const AppHome = lazy(() => import("./pages/AppHome"));
const Markets = lazy(() => import("./pages/Markets"));
const Liquidity = lazy(() => import("./pages/Liquidity"));
const NewPosition = lazy(() => import("./pages/NewPosition"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Well = lazy(() => import("./pages/Well"));
const Protocol = lazy(() => import("./pages/Protocol"));
const Referrals = lazy(() => import("./pages/Referrals"));
const Roadmap = lazy(() => import("./pages/Roadmap"));
const Whitepaper = lazy(() => import("./pages/Whitepaper"));
const NotFound = lazy(() => import("./pages/NotFound"));

function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-6 py-10">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <Skeleton className="mt-6 h-72 w-full" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="app" element={<AppHome />} />
          <Route path="markets" element={<Markets />} />
          <Route path="liquidity" element={<Liquidity />} />
          <Route path="liquidity/new" element={<NewPosition />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="staking" element={<Well />} />
          <Route path="token" element={<Protocol />} />
          <Route path="referrals" element={<Referrals />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="whitepaper" element={<Whitepaper />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
