import { createRoot } from 'react-dom/client';
import ApplicationPage from './pages/ApplicationPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HomePage from './pages/HomePage.jsx';

const view = new URLSearchParams(window.location.search).get('view');
const isApplicationPage = window.location.pathname.endsWith('/application.html');
const Page = isApplicationPage
	? view === 'account' ? AccountPage : view === 'dashboard' ? DashboardPage : ApplicationPage
	: HomePage;

createRoot(document.getElementById('root')).render(<Page />);