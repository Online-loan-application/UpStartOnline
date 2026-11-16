import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import ApplicationPage from './pages/ApplicationPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import HomePage from './pages/HomePage.jsx';

const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const TransferPage = lazy(() => import('./pages/TransferPage.jsx'));
const TransferSerialPage = lazy(() => import('./pages/TransferSerialPage.jsx'));
const HistoryPage = lazy(() => import('./pages/HistoryPage.jsx'));
const AdminApplicantPage = lazy(() => import('./pages/AdminApplicantPage.jsx'));
const view = new URLSearchParams(window.location.search).get('view');
const isApplicationPage = window.location.pathname.endsWith('/application.html');
const Page = isApplicationPage
	? view === 'account' ? AccountPage : view === 'dashboard' ? DashboardPage : view === 'profile' ? ProfilePage : view === 'transfer' ? TransferPage : view === 'transfer-serial' ? TransferSerialPage : view === 'history' ? HistoryPage : view === 'admin' ? AdminPage : view === 'admin-applicant' ? AdminApplicantPage : ApplicationPage
	: HomePage;

createRoot(document.getElementById('root')).render(
	<Suspense fallback={<main className="container dashboard-loading" aria-live="polite">Loading your account…</main>}>
		<Page />
	</Suspense>,
);