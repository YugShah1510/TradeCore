# TradeCore

> A virtual stock market simulation platform with an order book, order-matching engine, and SQL-powered trade management.

## 📌 Overview

**TradeCore** is a virtual stock market simulator that recreates the basic working of an electronic trading system.

Users can place virtual **buy and sell orders**, and TradeCore matches compatible orders using **price and time priority**. When an order is matched, a virtual trade is executed and stored in the database.

The project is designed to demonstrate how order books, matching engines, trading data, and portfolio management work together in a simplified market environment.

---

## ✨ Features

- 📈 Virtual stock trading
- 🟢 Buy and sell orders
- 📚 Real-time order book
- ⚡ Order matching engine
- ⏱️ Price-time priority matching
- 🔄 Partial order execution
- ❌ Order cancellation
- 💼 Virtual portfolio management
- 💰 Virtual cash balance
- 📊 Trade history
- 📉 Market statistics
- 🗄️ SQL database for persistent data
- 📈 Market and portfolio visualizations

---

## 🏗️ How TradeCore Works

```text
                USER
                  │
                  ▼
          Place Buy / Sell Order
                  │
                  ▼
            Backend API
                  │
                  ▼
          ┌───────────────┐
          │ Matching      │
          │ Engine        │
          └───────┬───────┘
                  │
                  ▼
             Order Book
            /           \
         Bids           Asks
            \           /
             \         /
              ▼       ▼
             Order Match
                  │
                  ▼
             Trade Executed
                  │
                  ▼
             SQL Database
             /     |      \
            ▼      ▼       ▼
         Orders  Trades  Portfolio
                  │
                  ▼
              Dashboard
