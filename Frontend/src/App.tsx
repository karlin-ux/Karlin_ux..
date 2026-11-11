import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout/Layout';
import { RequireAuth, RequireSuper } from './components/Protected';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Engineering from './pages/Engineering';
import Projects from './pages/Projects';
import Technologies from './pages/Technologies';
import About from './pages/About';
import Contact from './pages/Contact';
import SignIn from './pages/SignIn';
import Register from './pages/Register';
import CustomerHome from './pages/CustomerHome';
import AdminDashboard from './pages/AdminDashboard';
import MediaLibrary from './pages/MediaLibrary';
import ProductViewer3D from './pages/ProductViewer3D';
import WebsiteBuilder from './pages/WebsiteBuilder';
import Reports from './pages/Reports';
import BookingCalendar from './pages/BookingCalendar';
import SuperAdmin from './pages/SuperAdmin';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/engineering" element={<Engineering />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/technologies" element={<Technologies />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/register" element={<Register />} />
          <Route path="/customer/*" element={<RequireAuth><CustomerHome /></RequireAuth>} />
          <Route path="/admin/*" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
          <Route path="/media" element={<RequireAuth><MediaLibrary /></RequireAuth>} />
          <Route path="/3d" element={<ProductViewer3D />} />
          <Route path="/builder" element={<RequireAuth><WebsiteBuilder /></RequireAuth>} />
          <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
          <Route path="/calendar" element={<RequireAuth><BookingCalendar /></RequireAuth>} />
          <Route path="/superadmin/*" element={<RequireAuth><RequireSuper><SuperAdmin /></RequireSuper></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}