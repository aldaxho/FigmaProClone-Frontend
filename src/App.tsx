import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Projects from './pages/Projects';
import EditorApp from './pages/EditorApp';
import FlutterEditorApp from './pages/FlutterEditorApp';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/projects" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Projects />
          </ProtectedRoute>
        }
      />
      <Route
        path="/editor"
        element={
          <ProtectedRoute>
            <EditorApp />
          </ProtectedRoute>
        }
      />  <Route
        path="/flutter-editor"
        element={
          <ProtectedRoute>
            <FlutterEditorApp />
          </ProtectedRoute>
        }
      />
      <Route path="/editor/:id" element={<EditorApp />} />
      <Route path="/flutter-editor/:id" element={<FlutterEditorApp />} />

    </Routes>
  );
}
