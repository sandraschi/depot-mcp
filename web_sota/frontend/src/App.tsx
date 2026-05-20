import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Browse from "./pages/Browse";
import Search from "./pages/Search";
import Upload from "./pages/Upload";
import Stats from "./pages/Stats";
import Chat from "./pages/Chat";
import Help from "./pages/Help";
import Tools from "./pages/Tools";
import FileDetail from "./pages/FileDetail";
import ImportPage from "./pages/ImportPage";
import Settings from "./pages/Settings";

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
