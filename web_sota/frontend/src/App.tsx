import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Browse from "./pages/Browse";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import FileDetail from "./pages/FileDetail";
import Help from "./pages/Help";
import ImportPage from "./pages/ImportPage";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import Stats from "./pages/Stats";
import Tools from "./pages/Tools";
import Upload from "./pages/Upload";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="browse" element={<Browse />} />
        <Route path="search" element={<Search />} />
        <Route path="upload" element={<Upload />} />
        <Route path="stats" element={<Stats />} />
        <Route path="chat" element={<Chat />} />
        <Route path="help" element={<Help />} />
        <Route path="tools" element={<Tools />} />
        <Route path="file/:id" element={<FileDetail />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
