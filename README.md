# 📈 TradeCore — Full-Stack Virtual Stock Market Simulator

**TradeCore** is a production-grade, educational virtual stock market simulator built to give students, developers, and finance enthusiasts hands-on experience with how financial exchanges operate under the hood.

Every new user begins with **$100,000 in simulated virtual capital** to practice trading, inspect market depth, and test limit order execution dynamics without real-world financial risk.

---

## 📌 Table of Contents
1. [Key Features](#-key-features)
2. [Technology Stack](#-technology-stack)
3. [Architecture & Folder Structure](#-architecture--folder-structure)
4. [Prerequisites](#-prerequisites)
5. [Database Setup (PostgreSQL & pgAdmin 4)](#-database-setup-postgresql--pgadmin-4)
6. [Backend Setup & Prisma 6](#-backend-setup--prisma-6)
7. [Frontend Setup (React + Vite)](#-frontend-setup-react--vite)
8. [Running the Application](#-running-the-application)
9. [Core Order-Matching Engine Mechanics](#-core-order-matching-engine-mechanics)
10. [Virtual Cash, Holding Reserves & Accounting](#-virtual-cash-holding-reserves--accounting)
11. [REST API Documentation](#-rest-api-documentation)
12. [Database Schema Models](#-database-schema-models)
13. [Running Automated Tests](#-running-automated-tests)
14. [Troubleshooting & FAQ](#-troubleshooting--faq)
15. [Educational Disclaimer](#-educational-disclaimer)

---

## 🚀 Key Features

- **Virtual Capital Allocation:** Automatically assigns \$100,000 in virtual cash upon user registration.
- **Limit Order Matching Engine:** Deterministic matching based on **Price-Time Priority**.
- **Resting Order Pricing:** Executes at the resting order's limit price, giving incoming orders price improvement.
- **Partial Fills Support:** Seamlessly matches available liquidity while keeping unfilled balances open in the order book.
- **Aggregated Order Book:** Real-time visibility into bids, asks, bid-ask spreads, and cumulative depth.
- **Interactive Stock Charts:** Historical price trends across 1D, 1W, 1M, 1Y, and ALL timeframes via Recharts.
- **Double-Entry Balance Reservation:** Cash and stock shares are atomically locked upon order submission to prevent double-spending or overselling.
- **Order Cancellation:** Cancel open or partially filled quotes with immediate refunds of remaining reserved funds.
- **Portfolio Analytics & Telemetry:** Real-time tracking of portfolio net worth, realized vs. unrealized P&L, turnover, and asset allocation.
- **Light Theme UI:** Mature financial SaaS aesthetic using the TradeCore light palette.

---

## 💻 Technology Stack

### Frontend
- **React 18** & **Vite** (functional components, React hooks)
- **React Router DOM v6** (client-side routing and protected routes)
- **Axios** (centralized API client with JWT interceptors)
- **Recharts** (responsive area, pie, and bar charts)
- **Lucide React** (clean financial iconography)
- **Plain CSS Design System** (custom CSS variables matching TradeCore light design tokens)

### Backend
- **Node.js** (v18+) & **Express.js** (CommonJS modules)
- **JWT (JSON Web Tokens)** for stateless, secure session authorization
- **bcryptjs** for robust password hashing
- **dotenv** for environment variable isolation

### Database & ORM
- **PostgreSQL** (relational database engine)
- **Prisma ORM Version 6.x** (`@prisma/client@^6.4.1` and `prisma@^6.4.1`)
- **pgAdmin 4** compatible

---

## 📁 Architecture & Folder Structure

```
TradeCore2/
├── client/                      # Frontend React Application
│   ├── src/
│   │   ├── components/          # Reusable UI components (MetricCard, Modal, StockChart, etc.)
│   │   ├── context/             # AuthContext (JWT management & cash refresh)
│   │   ├── layouts/             # PublicLayout (top navbar) & AppLayout (sidebar & header)
│   │   ├── pages/               # 12 Required pages (Dashboard, Trade, OrderBook, etc.)
│   │   ├── services/            # Axios API client methods
│   │   ├── styles/              # Global CSS & color tokens
│   │   ├── App.jsx              # Application router
│   │   └── main.jsx             # React entry point
│   ├── .env.example             # Client environment template
│   ├── index.html               # HTML document with Inter font
│   ├── package.json
│   └── vite.config.js
│
├── server/                      # Backend Node.js & Express API
│   ├── prisma/
│   │   ├── schema.prisma        # Prisma 6 PostgreSQL schema
│   │   ├── seed.js              # Safe upsert database seed script
│   │   └── migrations/          # SQL migrations history
│   ├── src/
│   │   ├── config/              # Prisma client singleton
│   │   ├── controllers/         # Express controllers (auth, orders, stocks, portfolio, etc.)
│   │   ├── middleware/          # JWT auth & centralized error handler
│   │   ├── routes/              # Express API routers
│   │   ├── services/            # Core matching engine (matchingEngine.js)
│   │   ├── app.js               # Express application configuration
│   │   └── server.js            # Server entry point
│   ├── tests/                   # Backend automated tests
│   ├── .env.example             # Server environment template
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## ⚙️ Prerequisites

Make sure the following are installed on your machine:
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **PostgreSQL** (v14 or higher)
- **pgAdmin 4** (optional, recommended for viewing tables visually)

---

## 🗄️ Database Setup (PostgreSQL & pgAdmin 4)

1. Start your local PostgreSQL service:
   - **macOS (Homebrew):** `brew services start postgresql`
   - **Windows:** Ensure the PostgreSQL service is running in Windows Services.
   - **Linux:** `sudo systemctl start postgresql`

2. Open **pgAdmin 4** or your terminal `psql`:
   - Connect to your PostgreSQL server.
   - Right-click **Databases** -> **Create** -> **Database...**
   - Enter Database name: `tradecore`
   - Click **Save**.

   *Or run via terminal:*
   ```bash
   createdb tradecore
   ```

3. Default connection URL format:
   ```
   postgresql://postgres:postgres@localhost:5432/tradecore?schema=public
   ```
   *(Replace username and password with your local PostgreSQL credentials if different).*

---

## 🛠️ Backend Setup & Prisma 6

1. Navigate to the `server/` directory:
   ```bash
   cd server
   ```

2. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` if your PostgreSQL username, password, or port differs.*

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run the Prisma 6 migration to create all tables:
   ```bash
   npx prisma migrate dev --name init
   ```

5. Seed sample stocks (AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL) and historical price points:
   ```bash
   npm run prisma:seed
   ```

---

## 💻 Frontend Setup (React + Vite)

1. Open a new terminal and navigate to `client/`:
   ```bash
   cd client
   ```

2. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

---

## 🏃 Running the Application

### 1. Start the Backend API Server
In the `server/` directory:
```bash
npm start
```
The backend API will start on **http://localhost:5001**.
You can verify health by opening: `http://localhost:5001/api/health`

### 2. Start the React Frontend
In the `client/` directory:
```bash
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## ⚡ Core Order-Matching Engine Mechanics

The order matching engine resides in `server/src/services/matchingEngine.js`.

### 1. Price-Time Priority
- **BUY Orders (Bids):** Highest limit price has first priority. If two bids have the exact same price, the older order (earlier `createdAt`) matches first.
- **SELL Orders (Asks):** Lowest limit price has first priority. If two asks have the exact same price, the older order matches first.

### 2. Match Condition
- An incoming BUY order matches a resting SELL order if:
  $$\text{Buy Limit Price} \ge \text{Sell Limit Price}$$
- An incoming SELL order matches a resting BUY order if:
  $$\text{Sell Limit Price} \le \text{Buy Limit Price}$$

### 3. Execution Price Rule
Trades always execute at the **price of the resting order** (the order already sitting in the book).
- If buyer bids \$55.00 and resting seller offers \$50.00: trade executes at **\$50.00**.
- The buyer receives a **\$5.00/share price improvement refund** directly back into their available cash!

### 4. Partial Fills
If an incoming order quantity exceeds the resting order's remaining quantity:
1. The available quantity is executed and the resting order becomes `FILLED`.
2. The remaining incoming quantity checks the next resting order in priority.
3. If no more counterparties match, the unfilled shares remain resting as `PARTIALLY_FILLED` or `OPEN`.

---

## 💰 Virtual Cash, Holding Reserves & Accounting

Every financial transition runs in atomic database transactions (`prisma.$transaction`):

| Action | Financial Effect |
| :--- | :--- |
| **User Registration** | `availableBalance = $100,000.00`, `reservedBalance = $0.00` |
| **Place BUY Order** | Reserves $\text{qty} \times \text{limitPrice}$. Deducted from available cash, added to reserved cash. |
| **Place SELL Order** | Reserves $\text{qty}$ shares in `PortfolioHolding.reservedQuantity`. Prevents double selling. |
| **Trade Execution** | Buyer's reserved cash pays trade value ($\text{matchQty} \times \text{execPrice}$). Excess is refunded. Seller receives proceeds in available cash. |
| **Order Cancellation** | Releases remaining unfilled cash or shares back to available balances immediately. |

---

## 📡 REST API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Registers new account, allocates \$100k cash, returns JWT.
- `POST /api/auth/login` — Authenticates email/password, returns JWT & balances.
- `POST /api/auth/logout` — Ends session.
- `GET /api/auth/me` — Fetches authenticated user info & latest cash balances.

### Stocks & Markets (`/api/stocks`)
- `GET /api/stocks` — List all stocks with 24h change & volume (supports `?search=` and `?category=`).
- `GET /api/stocks/:symbol` — Single stock detail, best bid/ask, and recent executions.
- `GET /api/stocks/:symbol/history` — Price history points for charts (`?range=1D|1W|1M|1Y|ALL`).

### Orders & Matching (`/api/orders`)
- `POST /api/orders` — Submits a limit order (`stockId`, `side`, `quantity`, `limitPrice`) to the matching engine.
- `GET /api/orders` — Fetches user's orders (supports filter by `?status=OPEN|PARTIALLY_FILLED|FILLED|CANCELLED`).
- `GET /api/orders/:id` — Details of a specific order.
- `POST /api/orders/:id/cancel` — Cancels an open or partially filled order.

### Order Book (`/api/order-book`)
- `GET /api/order-book/:symbol` — Aggregated bids and asks by price level with cumulative market depth.

### Portfolio & Holdings (`/api/portfolio`)
- `GET /api/portfolio` — Total net worth, cash, holdings breakdown, and realized/unrealized P&L.
- `GET /api/portfolio/holdings` — User's active share positions.

### Trade History (`/api/trades`)
- `GET /api/trades` — User's completed trade executions with user perspective (`BUY` or `SELL`).

### Analytics & Profile (`/api/analytics`, `/api/users`)
- `GET /api/analytics/summary` — Quantitative metrics, side distribution, top stocks, and volume trends.
- `GET /api/users/me` — User profile details.
- `PATCH /api/users/me` — Update name or email.
- `PATCH /api/users/me/password` — Change password.

---

## 🗃️ Database Schema Models

- **User**: User credentials, timestamps, and relational links.
- **CashAccount**: 1:1 relation with User. Stores `initialBalance`, `availableBalance`, `reservedBalance`.
- **Stock**: Ticker `symbol`, company name, `currentPrice`, `previousClose`, `volume`.
- **StockPriceHistory**: Historical price snapshots for interactive charting.
- **Order**: Order details with `side` (`BUY`/`SELL`), `limitPrice`, `quantity`, `filledQuantity`, `status` (`OPEN`, `PARTIALLY_FILLED`, `FILLED`, `CANCELLED`).
- **Trade**: Canonical record of every match storing `buyOrderId`, `sellOrderId`, `buyerId`, `sellerId`, `executionPrice`, `quantity`, and timestamp.
- **PortfolioHolding**: Unique `[userId, stockId]` record storing `quantity`, `reservedQuantity`, and weighted `averagePurchasePrice`.

---

## 🧪 Running Automated Tests

TradeCore includes an automated test suite verifying auth, registration, $100k allocation, matching engine price-time priority, partial fills, cancellations, and balance safety.

To execute tests:
```bash
cd server
npm test
```

Expected output:
```
✔ User receives exactly $100,000 virtual cash upon creation
✔ Placing a BUY order reserves required cash
✔ Cancelling an OPEN BUY order releases reserved cash
✔ Placing a SELL order reserves stock quantity
✔ Order matching executes at resting order price with partial fill
✔ Cannot place BUY order when funds are insufficient
✔ Cannot place SELL order when available shares are insufficient
✔ POST /api/auth/register creates user with $100,000 virtual cash
✔ POST /api/auth/register rejects duplicate email
✔ POST /api/auth/login succeeds with correct credentials
✔ Price-Time Priority: Higher bid price executes before lower bid price
ℹ pass 11
ℹ fail 0
```

---

## 🔍 Troubleshooting & FAQ

1. **`FATAL: role "postgres" does not exist`**
   - Update `DATABASE_URL` in `server/.env` with your active PostgreSQL username (e.g. `postgresql://your_user:password@localhost:5432/tradecore?schema=public`).
2. **`PrismaClientInitializationError: Can't reach database server`**
   - Verify PostgreSQL is running on port 5432 (`psql -c "SELECT 1;"`).
3. **`CORS error in browser console`**
   - Check `CLIENT_URL` in `server/.env` matches the Vite dev server port (default: `http://localhost:5173`).

---

## 🎓 Educational Disclaimer

TradeCore is an educational simulation platform. All currency balances, stock prices, order executions, and portfolio metrics are strictly simulated. TradeCore does not connect to actual financial markets or handle real currency.

