import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import List from './pages/List';
import Form from './pages/Form';
import Stats from './pages/Stats';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<List />} />
          <Route path="add" element={<Form />} />
          <Route path="edit/:id" element={<Form />} />
          <Route path="stats" element={<Stats />} />
        </Route>
      </Routes>
    </Router>
  );
}
