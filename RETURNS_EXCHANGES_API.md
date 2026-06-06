# Returns and Exchanges API Documentation

This document describes the enhanced Order Management system that supports **partial returns and exchanges at the item level**.

## Overview

The system now allows customers to:
- Return specific items from an order (not just the entire order)
- Exchange specific items for different variants (color, size, etc.)
- Track the status of return and exchange requests (Pending, Approved, Rejected, Completed)

## Database Schema Changes

### Order Model Updates

#### New Fields for Item-Level Returns

```javascript
returnedProducts: [
  {
    originalLineItemId: ObjectId,  // Reference to order.products._id
    productId: ObjectId,           // Reference to Product
    quantity: Number,
    
    // Price snapshot at time of return
    originalSellingPrice: Number,  // pre-discount selling price per unit
    originalDiscountPct: Number,    // discount percentage
    originalFinalPrice: Number,    // post-discount price per unit (what was charged)
    
    // Return calculation
    returnAmount: Number,          // quantity * originalFinalPrice
    
    // Status tracking
    status: String,                // "pending", "approved", "rejected", "completed"
    
    // Dates
    requestDate: Date,
    approvedDate: Date,
    completedDate: Date,
    
    // Reason
    returnReason: String,
  }
]
```

#### Enhanced Exchange Schema

```javascript
exchangedProducts: [
  {
    originalLineItemId: ObjectId,  // Reference to order.products._id
    originalProductId: ObjectId,   // Original product
    newProductId: ObjectId,        // New product
    quantity: Number,
    
    // Original line item prices
    originalSellingPrice: Number,
    originalDiscountPct: Number,
    originalFinalPrice: Number,
    
    // Replacement product prices
    newSellingPrice: Number,
    newDiscountPct: Number,
    newFinalPrice: Number,
    
    // Price adjustment
    priceAdjustment: Number,       // (newFinalPrice - originalFinalPrice) × quantity
    
    // Status tracking
    status: String,                // "pending", "approved", "rejected", "completed"
    
    // Dates
    requestDate: Date,
    approvedDate: Date,
    completedDate: Date,
    
    // Variant information
    newColor: String,
    newSize: String,
  }
]
```

## API Endpoints

### 1. Return Specific Items (New)

**Endpoint:** `PATCH /api/orders/:id/return-items`

**Description:** Submit a return request for specific items from an order.

**Request Body:**
```json
{
  "returnItems": [
    {
      "originalLineItemId": "507f1f77bcf86cd799439011",
      "quantity": 2
    }
  ],
  "returnReason": "Product didn't fit properly"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Return request submitted successfully",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "returnSummary": [
      {
        "originalLineItemId": "507f1f77bcf86cd799439011",
        "productId": "507f1f77bcf86cd799439012",
        "quantity": 2,
        "originalFinalPricePerUnit": "150.00",
        "returnAmount": "300.00",
        "status": "pending"
      }
    ],
    "totalReturnAmount": "300.00",
    "returnReason": "Product didn't fit properly",
    "refundStatus": "pending",
    "requestDate": "2024-01-15T10:30:00.000Z"
  }
}
```

**Validation Rules:**
- Cannot return items from a cancelled order
- Cannot return more quantity than was originally purchased
- Cannot return the same item twice
- Return reason is required

---

### 2. Approve Return Request

**Endpoint:** `PATCH /api/orders/:id/returns/:returnId/approve`

**Description:** Approve a pending return request. This restores stock for the returned items.

**Response:**
```json
{
  "success": true,
  "message": "Return request approved successfully",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "returnId": "507f1f77bcf86cd799439013",
    "status": "approved",
    "approvedDate": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### 3. Reject Return Request

**Endpoint:** `PATCH /api/orders/:id/returns/:returnId/reject`

**Description:** Reject a pending return request.

**Request Body:**
```json
{
  "rejectionReason": "Return period expired"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Return request rejected successfully",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "returnId": "507f1f77bcf86cd799439013",
    "status": "rejected",
    "rejectionReason": "Return period expired"
  }
}
```

---

### 4. Complete Return Request

**Endpoint:** `PATCH /api/orders/:id/returns/:returnId/complete`

**Description:** Mark a return as completed (refund processed).

**Response:**
```json
{
  "success": true,
  "message": "Return completed successfully",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "returnId": "507f1f77bcf86cd799439013",
    "status": "completed",
    "completedDate": "2024-01-15T12:00:00.000Z",
    "refundStatus": "processed",
    "refundDate": "2024-01-15T12:00:00.000Z"
  }
}
```

---

### 5. Exchange Products (Enhanced)

**Endpoint:** `PATCH /api/orders/:id/exchange`

**Description:** Exchange specific items for different variants. Now includes status tracking.

**Request Body:**
```json
{
  "exchangeItems": [
    {
      "originalLineItemId": "507f1f77bcf86cd799439011",
      "newProductId": "507f1f77bcf86cd799439014",
      "quantity": 1,
      "newColor": "red",
      "newSize": "L"
    }
  ],
  "exchangeReason": "Wrong size ordered"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order products exchanged successfully",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "exchangeSummary": [
      {
        "originalProductId": "507f1f77bcf86cd799439012",
        "newProductId": "507f1f77bcf86cd799439014",
        "quantity": 1,
        "originalSellingPrice": "200.00",
        "originalDiscountPct": 0,
        "originalFinalPricePerUnit": "200.00",
        "newSellingPrice": "250.00",
        "newDiscountPct": 0,
        "newFinalPricePerUnit": "250.00",
        "differencePerUnit": "50.00",
        "totalLineDifference": "50.00"
      }
    ],
    "totalPriceAdjustment": "50.00",
    "previousTotalPrice": "1000.00",
    "newTotalPrice": "1050.00",
    "depositAlreadyPaid": "500.00",
    "newDueAmount": "550.00",
    "exchangeReason": "Wrong size ordered",
    "updatedOrder": { ... }
  }
}
```

**Validation Rules:**
- Cannot exchange items from a cancelled or returned order
- Cannot exchange items if deposit is not confirmed
- Cannot exchange more quantity than was originally purchased
- New product variant must have sufficient stock
- Only shows available variants that are in stock

---

### 6. Approve Exchange Request

**Endpoint:** `PATCH /api/orders/:id/exchanges/:exchangeId/approve`

**Description:** Approve a pending exchange request.

**Response:**
```json
{
  "success": true,
  "message": "Exchange request approved successfully",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "exchangeId": "507f1f77bcf86cd799439015",
    "status": "approved",
    "approvedDate": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### 7. Reject Exchange Request

**Endpoint:** `PATCH /api/orders/:id/exchanges/:exchangeId/reject`

**Description:** Reject a pending exchange request.

**Request Body:**
```json
{
  "rejectionReason": "Requested variant out of stock"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Exchange request rejected successfully",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "exchangeId": "507f1f77bcf86cd799439015",
    "status": "rejected",
    "rejectionReason": "Requested variant out of stock"
  }
}
```

---

### 8. Complete Exchange Request

**Endpoint:** `PATCH /api/orders/:id/exchanges/:exchangeId/complete`

**Description:** Mark an exchange as completed.

**Response:**
```json
{
  "success": true,
  "message": "Exchange completed successfully",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "exchangeId": "507f1f77bcf86cd799439015",
    "status": "completed",
    "completedDate": "2024-01-15T12:00:00.000Z"
  }
}
```

---

## Status Flow

### Return Status Flow
```
pending → approved → completed
   ↓
rejected
```

### Exchange Status Flow
```
pending → approved → completed
   ↓
rejected
```

## Usage Examples

### Example 1: Return Specific Items

```javascript
// Customer wants to return 2 items from their order
const response = await fetch('/api/orders/507f1f77bcf86cd799439011/return-items', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    returnItems: [
      {
        originalLineItemId: '507f1f77bcf86cd799439011',
        quantity: 2
      }
    ],
    returnReason: 'Product didnt fit properly'
  })
});
```

### Example 2: Exchange for Different Color

```javascript
// Customer wants to exchange a shirt for a different color
const response = await fetch('/api/orders/507f1f77bcf86cd799439011/exchange', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    exchangeItems: [
      {
        originalLineItemId: '507f1f77bcf86cd799439011',
        newProductId: '507f1f77bcf86cd799439014',
        quantity: 1,
        newColor: 'red'
      }
    ],
    exchangeReason: 'Preferred different color'
  })
});
```

### Example 3: Admin Approves Return

```javascript
// Admin approves the return request
const response = await fetch('/api/orders/507f1f77bcf86cd799439011/returns/507f1f77bcf86cd799439013/approve', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' }
});
```

## Key Features

1. **Item-Level Operations**: Returns and exchanges work on specific items, not the entire order
2. **Quantity Control**: Can return/exchange partial quantities (e.g., return 2 out of 5 items)
3. **Stock Management**: Automatically restores stock when returns are approved
4. **Price Tracking**: Maintains price snapshots for accurate refund calculations
5. **Status Tracking**: Full audit trail with pending, approved, rejected, and completed states
6. **Variant Support**: Supports color and size variants for exchanges
7. **Validation**: Prevents invalid operations (exceeding quantities, returning cancelled orders, etc.)

## Backward Compatibility

The legacy full-order return endpoint (`PATCH /api/orders/:id/return`) is still available for backward compatibility. However, new implementations should use the item-level return endpoint (`PATCH /api/orders/:id/return-items`).

## Notes

- All monetary values are in the store's currency (EGP for this project)
- Stock restoration only occurs when deposit is confirmed
- Price adjustments for exchanges are calculated based on final prices (after discounts)
- The system maintains a complete history of all return and exchange actions for auditing
