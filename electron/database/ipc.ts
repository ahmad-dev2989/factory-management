import { ipcMain } from 'electron';
import { executeQuery, executeTransaction, getDatabase } from './database.js';

export function registerDatabaseIPCHandlers(): void {
  // IPC Handler for executing standard queries
  ipcMain.handle('db-query', async (_event, sql: string, params: any[] = []) => {
    return await executeQuery(sql, params);
  });

  // IPC Handler for executing transaction sequences
  ipcMain.handle('db-transaction', async (_event, queries: { sql: string; params?: any[] }[]) => {
    return await executeTransaction(queries);
  });

  // Transaction IPC Handler for saving a new sale
  ipcMain.handle('sales-create', async (_event, sale: any, items: any[]) => {
    return new Promise((resolve) => {
      const db = getDatabase();
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', async (err) => {
          if (err) {
            return resolve({ error: true, message: err.message });
          }

          try {
            const insertSaleSql = `
              INSERT INTO sales (
                invoice_number, customer_id, date, subtotal, discount, 
                grand_total, paid_amount, remaining_amount, payment_method, 
                payment_account_id, remarks, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
            `;
            
            db.run(insertSaleSql, [
              sale.invoiceNumber,
              sale.customerId,
              sale.date,
              sale.subtotal,
              sale.discount,
              sale.grandTotal,
              sale.paidAmount,
              sale.remainingAmount,
              sale.paymentMethod,
              sale.paymentAccountId || null,
              sale.remarks || ''
            ], function(this: any, runErr: any) {
              if (runErr) {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Sale insert failed: ' + runErr.message });
              }

              const saleId = this.lastID;
              const insertItemSql = `
                INSERT INTO sale_items (
                  sale_id, product_id, quantity, unit_price, discount, total
                ) VALUES (?, ?, ?, ?, ?, ?)
              `;

              let itemPromise = Promise.resolve();

              items.forEach((item) => {
                itemPromise = itemPromise.then(() => {
                  return new Promise<void>((itemResolve, itemReject) => {
                    db.run(insertItemSql, [
                      saleId,
                      item.productId,
                      item.quantity,
                      item.unitPrice,
                      item.discount || 0,
                      item.total
                    ], (itemErr) => {
                      if (itemErr) return itemReject(itemErr);

                      db.run(
                        'UPDATE products SET stock = stock - ? WHERE id = ?',
                        [item.quantity, item.productId],
                        (stockErr) => {
                          if (stockErr) return itemReject(stockErr);
                          itemResolve();
                        }
                      );
                    });
                  });
                });
              });

              itemPromise.then(() => {
                return new Promise<void>((custResolve, custReject) => {
                  db.run(
                    'UPDATE customers SET current_balance = current_balance + ? WHERE id = ?',
                    [sale.remainingAmount, sale.customerId],
                    (custErr) => {
                      if (custErr) return custReject(custErr);
                      custResolve();
                    }
                  );
                });
              }).then(() => {
                if (sale.paidAmount > 0 && sale.paymentAccountId) {
                  return new Promise<void>((acctResolve, acctReject) => {
                    db.run(
                      'UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?',
                      [sale.paidAmount, sale.paymentAccountId],
                      (acctErr) => {
                        if (acctErr) return acctReject(acctErr);
                        acctResolve();
                      }
                    );
                  });
                }
                return Promise.resolve();
              }).then(() => {
                db.run('COMMIT', (commitErr) => {
                  if (commitErr) {
                    db.run('ROLLBACK');
                    return resolve({ error: true, message: 'Commit failed: ' + commitErr.message });
                  }
                  resolve({ success: true, saleId });
                });
              }).catch((flowErr) => {
                db.run('ROLLBACK');
                resolve({ error: true, message: flowErr.message || 'Transaction flow error' });
              });
            });
          } catch (ex: any) {
            db.run('ROLLBACK');
            resolve({ error: true, message: ex.message });
          }
        });
      });
    });
  });

  // Transaction IPC Handler for updating an existing sale
  ipcMain.handle('sales-update', async (_event, saleId: number, sale: any, items: any[]) => {
    return new Promise((resolve) => {
      const db = getDatabase();
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', async (err) => {
          if (err) {
            return resolve({ error: true, message: err.message });
          }

          try {
            db.get('SELECT * FROM sales WHERE id = ?', [saleId], (saleErr, oldSale: any) => {
              if (saleErr || !oldSale) {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Old sale details not found.' });
              }

              db.all('SELECT * FROM sale_items WHERE sale_id = ?', [saleId], (itemsErr, oldItems: any[]) => {
                if (itemsErr) {
                  db.run('ROLLBACK');
                  return resolve({ error: true, message: 'Old sale items fetch failed.' });
                }

                let revertPromise = Promise.resolve();
                oldItems.forEach((oldItem) => {
                  revertPromise = revertPromise.then(() => {
                    return new Promise<void>((revResolve, revReject) => {
                      db.run(
                        'UPDATE products SET stock = stock + ? WHERE id = ?',
                        [oldItem.quantity, oldItem.product_id],
                        (stockErr) => {
                          if (stockErr) return revReject(stockErr);
                          revResolve();
                        }
                      );
                    });
                  });
                });

                revertPromise.then(() => {
                  return new Promise<void>((custResolve, custReject) => {
                    db.run(
                      'UPDATE customers SET current_balance = current_balance - ? WHERE id = ?',
                      [oldSale.remaining_amount, oldSale.customer_id],
                      (custErr) => {
                        if (custErr) return custReject(custErr);
                        custResolve();
                      }
                    );
                  });
                }).then(() => {
                  if (oldSale.paid_amount > 0 && oldSale.payment_account_id) {
                    return new Promise<void>((acctResolve, acctReject) => {
                      db.run(
                        'UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?',
                        [oldSale.paid_amount, oldSale.payment_account_id],
                        (acctErr) => {
                          if (acctErr) return acctReject(acctErr);
                          acctResolve();
                        }
                      );
                    });
                  }
                  return Promise.resolve();
                }).then(() => {
                  return new Promise<void>((delResolve, delReject) => {
                    db.run('DELETE FROM sale_items WHERE sale_id = ?', [saleId], (delErr) => {
                      if (delErr) return delReject(delErr);
                      delResolve();
                    });
                  });
                }).then(() => {
                  const updateSaleSql = `
                    UPDATE sales SET 
                      invoice_number = ?, customer_id = ?, date = ?, subtotal = ?, 
                      discount = ?, grand_total = ?, paid_amount = ?, remaining_amount = ?, 
                      payment_method = ?, payment_account_id = ?, remarks = ?, 
                      updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                  `;
                  return new Promise<void>((saleResolve, saleReject) => {
                    db.run(updateSaleSql, [
                      sale.invoiceNumber,
                      sale.customerId,
                      sale.date,
                      sale.subtotal,
                      sale.discount,
                      sale.grandTotal,
                      sale.paidAmount,
                      sale.remainingAmount,
                      sale.paymentMethod,
                      sale.paymentAccountId || null,
                      sale.remarks || '',
                      saleId
                    ], (upErr) => {
                      if (upErr) return saleReject(upErr);
                      saleResolve();
                    });
                  });
                }).then(() => {
                  const insertItemSql = `
                    INSERT INTO sale_items (
                      sale_id, product_id, quantity, unit_price, discount, total
                    ) VALUES (?, ?, ?, ?, ?, ?)
                  `;
                  let insertPromise = Promise.resolve();

                  items.forEach((item) => {
                    insertPromise = insertPromise.then(() => {
                      return new Promise<void>((itResolve, itReject) => {
                        db.run(insertItemSql, [
                          saleId,
                          item.productId,
                          item.quantity,
                          item.unitPrice,
                          item.discount || 0,
                          item.total
                        ], (itErr) => {
                          if (itErr) return itReject(itErr);

                          db.run(
                            'UPDATE products SET stock = stock - ? WHERE id = ?',
                            [item.quantity, item.productId],
                            (stockErr) => {
                              if (stockErr) return itReject(stockErr);
                              itResolve();
                            }
                          );
                        });
                      });
                    });
                  });

                  return insertPromise;
                }).then(() => {
                  return new Promise<void>((custResolve, custReject) => {
                    db.run(
                      'UPDATE customers SET current_balance = current_balance + ? WHERE id = ?',
                      [sale.remainingAmount, sale.customerId],
                      (custErr) => {
                        if (custErr) return custReject(custErr);
                        custResolve();
                      }
                    );
                  });
                }).then(() => {
                  if (sale.paidAmount > 0 && sale.paymentAccountId) {
                    return new Promise<void>((acctResolve, acctReject) => {
                      db.run(
                        'UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?',
                        [sale.paidAmount, sale.paymentAccountId],
                        (acctErr) => {
                          if (acctErr) return acctReject(acctErr);
                          acctResolve();
                        }
                      );
                    });
                  }
                  return Promise.resolve();
                }).then(() => {
                  db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                      db.run('ROLLBACK');
                      return resolve({ error: true, message: 'Commit failed: ' + commitErr.message });
                    }
                    resolve({ success: true });
                  });
                }).catch((flowErr) => {
                  db.run('ROLLBACK');
                  resolve({ error: true, message: flowErr.message || 'Transaction update failed.' });
                });
              });
            });
          } catch (ex: any) {
            db.run('ROLLBACK');
            resolve({ error: true, message: ex.message });
          }
        });
      });
    });
  });

  // Transaction IPC Handler for cancelling a sale
  ipcMain.handle('sales-cancel', async (_event, saleId: number) => {
    return new Promise((resolve) => {
      const db = getDatabase();
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', async (err) => {
          if (err) {
            return resolve({ error: true, message: err.message });
          }

          try {
            db.get('SELECT * FROM sales WHERE id = ?', [saleId], (saleErr, oldSale: any) => {
              if (saleErr || !oldSale) {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Sale not found.' });
              }

              if (oldSale.status === 'Cancelled') {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Sale is already cancelled.' });
              }

              db.all('SELECT * FROM sale_items WHERE sale_id = ?', [saleId], (itemsErr, oldItems: any[]) => {
                if (itemsErr) {
                  db.run('ROLLBACK');
                  return resolve({ error: true, message: 'Sale items fetch failed.' });
                }

                let revertPromise = Promise.resolve();
                oldItems.forEach((oldItem) => {
                  revertPromise = revertPromise.then(() => {
                    return new Promise<void>((revResolve, revReject) => {
                      db.run(
                        'UPDATE products SET stock = stock + ? WHERE id = ?',
                        [oldItem.quantity, oldItem.product_id],
                        (stockErr) => {
                          if (stockErr) return revReject(stockErr);
                          revResolve();
                        }
                      );
                    });
                  });
                });

                revertPromise.then(() => {
                  return new Promise<void>((custResolve, custReject) => {
                    db.run(
                      'UPDATE customers SET current_balance = current_balance - ? WHERE id = ?',
                      [oldSale.remaining_amount, oldSale.customer_id],
                      (custErr) => {
                        if (custErr) return custReject(custErr);
                        custResolve();
                      }
                    );
                  });
                }).then(() => {
                  if (oldSale.paid_amount > 0 && oldSale.payment_account_id) {
                    return new Promise<void>((acctResolve, acctReject) => {
                      db.run(
                        'UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?',
                        [oldSale.paid_amount, oldSale.payment_account_id],
                        (acctErr) => {
                          if (acctErr) return acctReject(acctErr);
                          acctResolve();
                        }
                      );
                    });
                  }
                  return Promise.resolve();
                }).then(() => {
                  return new Promise<void>((statusResolve, statusReject) => {
                    db.run(
                      "UPDATE sales SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                      [saleId],
                      (statusErr) => {
                        if (statusErr) return statusReject(statusErr);
                        statusResolve();
                      }
                    );
                  });
                }).then(() => {
                  db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                      db.run('ROLLBACK');
                      return resolve({ error: true, message: 'Commit failed: ' + commitErr.message });
                    }
                    resolve({ success: true });
                  });
                }).catch((flowErr) => {
                  db.run('ROLLBACK');
                  resolve({ error: true, message: flowErr.message || 'Transaction cancel failed.' });
                });
              });
            });
          } catch (ex: any) {
            db.run('ROLLBACK');
            resolve({ error: true, message: ex.message });
          }
        });
      });
    });
  });

  // Transaction IPC Handler for saving a new purchase
  ipcMain.handle('purchases-create', async (_event, purchase: any, items: any[]) => {
    return new Promise((resolve) => {
      const db = getDatabase();
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', async (err) => {
          if (err) {
            return resolve({ error: true, message: err.message });
          }

          try {
            const insertPurchaseSql = `
              INSERT INTO purchases (
                purchase_number, vendor_name, date, subtotal, discount, 
                grand_total, paid_amount, remaining_amount, payment_method, 
                payment_account_id, remarks, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
            `;
            
            db.run(insertPurchaseSql, [
              purchase.purchaseNumber,
              purchase.vendorName,
              purchase.date,
              purchase.subtotal,
              purchase.discount,
              purchase.grandTotal,
              purchase.paidAmount,
              purchase.remainingAmount,
              purchase.paymentMethod,
              purchase.paymentAccountId || null,
              purchase.remarks || ''
            ], function(this: any, runErr: any) {
              if (runErr) {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Purchase insert failed: ' + runErr.message });
              }

              const purchaseId = this.lastID;
              const insertItemSql = `
                INSERT INTO purchase_items (
                  purchase_id, product_id, quantity, purchase_price, discount, total
                ) VALUES (?, ?, ?, ?, ?, ?)
              `;

              let itemPromise = Promise.resolve();

              items.forEach((item) => {
                itemPromise = itemPromise.then(() => {
                  return new Promise<void>((itemResolve, itemReject) => {
                    db.run(insertItemSql, [
                      purchaseId,
                      item.productId,
                      item.quantity,
                      item.purchasePrice,
                      item.discount || 0,
                      item.total
                    ], (itemErr) => {
                      if (itemErr) return itemReject(itemErr);

                      // Increase stock immediately after purchase is saved
                      db.run(
                        'UPDATE products SET stock = stock + ? WHERE id = ?',
                        [item.quantity, item.productId],
                        (stockErr) => {
                          if (stockErr) return itemReject(stockErr);
                          itemResolve();
                        }
                      );
                    });
                  });
                });
              });

              itemPromise.then(() => {
                // Decrease selected account balance by paid amount
                if (purchase.paidAmount > 0 && purchase.paymentAccountId) {
                  return new Promise<void>((acctResolve, acctReject) => {
                    db.run(
                      'UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?',
                      [purchase.paidAmount, purchase.paymentAccountId],
                      (acctErr) => {
                        if (acctErr) return acctReject(acctErr);
                        acctResolve();
                      }
                    );
                  });
                }
                return Promise.resolve();
              }).then(() => {
                db.run('COMMIT', (commitErr) => {
                  if (commitErr) {
                    db.run('ROLLBACK');
                    return resolve({ error: true, message: 'Commit failed: ' + commitErr.message });
                  }
                  resolve({ success: true, purchaseId });
                });
              }).catch((flowErr) => {
                db.run('ROLLBACK');
                resolve({ error: true, message: flowErr.message || 'Transaction flow error' });
              });
            });
          } catch (ex: any) {
            db.run('ROLLBACK');
            resolve({ error: true, message: ex.message });
          }
        });
      });
    });
  });

  // Transaction IPC Handler for updating an existing purchase
  ipcMain.handle('purchases-update', async (_event, purchaseId: number, purchase: any, items: any[]) => {
    return new Promise((resolve) => {
      const db = getDatabase();
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', async (err) => {
          if (err) {
            return resolve({ error: true, message: err.message });
          }

          try {
            db.get('SELECT * FROM purchases WHERE id = ?', [purchaseId], (purchaseErr, oldPurchase: any) => {
              if (purchaseErr || !oldPurchase) {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Old purchase details not found.' });
              }

              db.all('SELECT * FROM purchase_items WHERE purchase_id = ?', [purchaseId], (itemsErr, oldItems: any[]) => {
                if (itemsErr) {
                  db.run('ROLLBACK');
                  return resolve({ error: true, message: 'Old purchase items fetch failed.' });
                }

                // Revert previous stock increase
                let revertPromise = Promise.resolve();
                oldItems.forEach((oldItem) => {
                  revertPromise = revertPromise.then(() => {
                    return new Promise<void>((revResolve, revReject) => {
                      db.run(
                        'UPDATE products SET stock = stock - ? WHERE id = ?',
                        [oldItem.quantity, oldItem.product_id],
                        (stockErr) => {
                          if (stockErr) return revReject(stockErr);
                          revResolve();
                        }
                      );
                    });
                  });
                });

                revertPromise.then(() => {
                  // Revert old payment account deduction (add it back)
                  if (oldPurchase.paid_amount > 0 && oldPurchase.payment_account_id) {
                    return new Promise<void>((acctResolve, acctReject) => {
                      db.run(
                        'UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?',
                        [oldPurchase.paid_amount, oldPurchase.payment_account_id],
                        (acctErr) => {
                          if (acctErr) return acctReject(acctErr);
                          acctResolve();
                        }
                      );
                    });
                  }
                  return Promise.resolve();
                }).then(() => {
                  return new Promise<void>((delResolve, delReject) => {
                    db.run('DELETE FROM purchase_items WHERE purchase_id = ?', [purchaseId], (delErr) => {
                      if (delErr) return delReject(delErr);
                      delResolve();
                    });
                  });
                }).then(() => {
                  const updatePurchaseSql = `
                    UPDATE purchases SET 
                      purchase_number = ?, vendor_name = ?, date = ?, subtotal = ?, 
                      discount = ?, grand_total = ?, paid_amount = ?, remaining_amount = ?, 
                      payment_method = ?, payment_account_id = ?, remarks = ?, 
                      updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                  `;
                  return new Promise<void>((purchaseResolve, purchaseReject) => {
                    db.run(updatePurchaseSql, [
                      purchase.purchaseNumber,
                      purchase.vendorName,
                      purchase.date,
                      purchase.subtotal,
                      purchase.discount,
                      purchase.grandTotal,
                      purchase.paidAmount,
                      purchase.remainingAmount,
                      purchase.paymentMethod,
                      purchase.paymentAccountId || null,
                      purchase.remarks || '',
                      purchaseId
                    ], (upErr) => {
                      if (upErr) return purchaseReject(upErr);
                      purchaseResolve();
                    });
                  });
                }).then(() => {
                  const insertItemSql = `
                    INSERT INTO purchase_items (
                      purchase_id, product_id, quantity, purchase_price, discount, total
                    ) VALUES (?, ?, ?, ?, ?, ?)
                  `;
                  let insertPromise = Promise.resolve();

                  items.forEach((item) => {
                    insertPromise = insertPromise.then(() => {
                      return new Promise<void>((itResolve, itReject) => {
                        db.run(insertItemSql, [
                          purchaseId,
                          item.productId,
                          item.quantity,
                          item.purchasePrice,
                          item.discount || 0,
                          item.total
                        ], (itErr) => {
                          if (itErr) return itReject(itErr);

                          // Add new stock
                          db.run(
                            'UPDATE products SET stock = stock + ? WHERE id = ?',
                            [item.quantity, item.productId],
                            (stockErr) => {
                              if (stockErr) return itReject(stockErr);
                              itResolve();
                            }
                          );
                        });
                      });
                    });
                  });

                  return insertPromise;
                }).then(() => {
                  // Deduct new payment amount
                  if (purchase.paidAmount > 0 && purchase.paymentAccountId) {
                    return new Promise<void>((acctResolve, acctReject) => {
                      db.run(
                        'UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?',
                        [purchase.paidAmount, purchase.paymentAccountId],
                        (acctErr) => {
                          if (acctErr) return acctReject(acctErr);
                          acctResolve();
                        }
                      );
                    });
                  }
                  return Promise.resolve();
                }).then(() => {
                  db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                      db.run('ROLLBACK');
                      return resolve({ error: true, message: 'Commit failed: ' + commitErr.message });
                    }
                    resolve({ success: true });
                  });
                }).catch((flowErr) => {
                  db.run('ROLLBACK');
                  resolve({ error: true, message: flowErr.message || 'Transaction update failed.' });
                });
              });
            });
          } catch (ex: any) {
            db.run('ROLLBACK');
            resolve({ error: true, message: ex.message });
          }
        });
      });
    });
  });

  // Transaction IPC Handler for cancelling a purchase (soft delete)
  ipcMain.handle('purchases-cancel', async (_event, purchaseId: number) => {
    return new Promise((resolve) => {
      const db = getDatabase();
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', async (err) => {
          if (err) {
            return resolve({ error: true, message: err.message });
          }

          try {
            db.get('SELECT * FROM purchases WHERE id = ?', [purchaseId], (purchaseErr, oldPurchase: any) => {
              if (purchaseErr || !oldPurchase) {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Purchase not found.' });
              }

              if (oldPurchase.status === 'Cancelled') {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Purchase is already cancelled.' });
              }

              db.all('SELECT * FROM purchase_items WHERE purchase_id = ?', [purchaseId], (itemsErr, oldItems: any[]) => {
                if (itemsErr) {
                  db.run('ROLLBACK');
                  return resolve({ error: true, message: 'Purchase items fetch failed.' });
                }

                // Revert stock increase (decrease stock)
                let revertPromise = Promise.resolve();
                oldItems.forEach((oldItem) => {
                  revertPromise = revertPromise.then(() => {
                    return new Promise<void>((revResolve, revReject) => {
                      db.run(
                        'UPDATE products SET stock = stock - ? WHERE id = ?',
                        [oldItem.quantity, oldItem.product_id],
                        (stockErr) => {
                          if (stockErr) return revReject(stockErr);
                          revResolve();
                        }
                      );
                    });
                  });
                });

                revertPromise.then(() => {
                  // Restore account balance (add it back)
                  if (oldPurchase.paid_amount > 0 && oldPurchase.payment_account_id) {
                    return new Promise<void>((acctResolve, acctReject) => {
                      db.run(
                        'UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?',
                        [oldPurchase.paid_amount, oldPurchase.payment_account_id],
                        (acctErr) => {
                          if (acctErr) return acctReject(acctErr);
                          acctResolve();
                        }
                      );
                    });
                  }
                  return Promise.resolve();
                }).then(() => {
                  return new Promise<void>((statusResolve, statusReject) => {
                    db.run(
                      "UPDATE purchases SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                      [purchaseId],
                      (statusErr) => {
                        if (statusErr) return statusReject(statusErr);
                        statusResolve();
                      }
                    );
                  });
                }).then(() => {
                  db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                      db.run('ROLLBACK');
                      return resolve({ error: true, message: 'Commit failed: ' + commitErr.message });
                    }
                    resolve({ success: true });
                  });
                }).catch((flowErr) => {
                  db.run('ROLLBACK');
                  resolve({ error: true, message: flowErr.message || 'Transaction cancel failed.' });
                });
              });
            });
          } catch (ex: any) {
            db.run('ROLLBACK');
            resolve({ error: true, message: ex.message });
          }
        });
      });
    });
  });

  // Transaction IPC Handler for saving a new cash_in record
  ipcMain.handle('cash-in-create', async (_event, item: any) => {
    return new Promise((resolve) => {
      const db = getDatabase();
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', async (err) => {
          if (err) return resolve({ error: true, message: err.message });

          try {
            const sql = `
              INSERT INTO cash_in (
                voucher_number, date, received_from, category, 
                account_id, amount, reference, remarks, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')
            `;
            db.run(sql, [
              item.voucherNumber,
              item.date,
              item.receivedFrom,
              item.category,
              item.accountId,
              item.amount,
              item.reference || '',
              item.remarks || ''
            ], function(this: any, runErr: any) {
              if (runErr) {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Cash In insert failed: ' + runErr.message });
              }

              const voucherId = this.lastID;

              // Increase account balance
              db.run(
                'UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?',
                [item.amount, item.accountId],
                (acctErr) => {
                  if (acctErr) {
                    db.run('ROLLBACK');
                    return resolve({ error: true, message: 'Account update failed: ' + acctErr.message });
                  }

                  db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                      db.run('ROLLBACK');
                      return resolve({ error: true, message: 'Commit failed: ' + commitErr.message });
                    }
                    resolve({ success: true, voucherId });
                  });
                }
              );
            });
          } catch (ex: any) {
            db.run('ROLLBACK');
            resolve({ error: true, message: ex.message });
          }
        });
      });
    });
  });

  // Transaction IPC Handler for updating an existing cash_in record
  ipcMain.handle('cash-in-update', async (_event, id: number, item: any) => {
    return new Promise((resolve) => {
      const db = getDatabase();
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', async (err) => {
          if (err) return resolve({ error: true, message: err.message });

          try {
            db.get('SELECT * FROM cash_in WHERE id = ?', [id], (fetchErr, old: any) => {
              if (fetchErr || !old) {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Old cash in voucher not found.' });
              }

              // Revert old account increase
              db.run(
                'UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?',
                [old.amount, old.account_id],
                (revertErr) => {
                  if (revertErr) {
                    db.run('ROLLBACK');
                    return resolve({ error: true, message: 'Account balance revert failed: ' + revertErr.message });
                  }

                  // Apply new increase
                  db.run(
                    'UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?',
                    [item.amount, item.accountId],
                    (applyErr) => {
                      if (applyErr) {
                        db.run('ROLLBACK');
                        return resolve({ error: true, message: 'Account balance apply failed: ' + applyErr.message });
                      }

                      // Update cash_in record
                      const sql = `
                        UPDATE cash_in SET 
                          voucher_number = ?, date = ?, received_from = ?, category = ?, 
                          account_id = ?, amount = ?, reference = ?, remarks = ?, 
                          updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                      `;
                      db.run(sql, [
                        item.voucherNumber,
                        item.date,
                        item.receivedFrom,
                        item.category,
                        item.accountId,
                        item.amount,
                        item.reference || '',
                        item.remarks || '',
                        id
                      ], (upErr) => {
                        if (upErr) {
                          db.run('ROLLBACK');
                          return resolve({ error: true, message: 'Voucher update failed: ' + upErr.message });
                        }

                        db.run('COMMIT', (commitErr) => {
                          if (commitErr) {
                            db.run('ROLLBACK');
                            return resolve({ error: true, message: 'Commit failed: ' + commitErr.message });
                          }
                          resolve({ success: true });
                        });
                      });
                    }
                  );
                }
              );
            });
          } catch (ex: any) {
            db.run('ROLLBACK');
            resolve({ error: true, message: ex.message });
          }
        });
      });
    });
  });

  // Transaction IPC Handler for cancelling a cash_in record
  ipcMain.handle('cash-in-cancel', async (_event, id: number) => {
    return new Promise((resolve) => {
      const db = getDatabase();
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', async (err) => {
          if (err) return resolve({ error: true, message: err.message });

          try {
            db.get('SELECT * FROM cash_in WHERE id = ?', [id], (fetchErr, old: any) => {
              if (fetchErr || !old) {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Cash in voucher not found.' });
              }

              if (old.status === 'Cancelled') {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Voucher already cancelled.' });
              }

              // Revert balance (deduct)
              db.run(
                'UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?',
                [old.amount, old.account_id],
                (revertErr) => {
                  if (revertErr) {
                    db.run('ROLLBACK');
                    return resolve({ error: true, message: 'Balance revert failed.' });
                  }

                  db.run(
                    "UPDATE cash_in SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [id],
                    (statusErr) => {
                      if (statusErr) {
                        db.run('ROLLBACK');
                        return resolve({ error: true, message: 'Status update failed.' });
                      }

                      db.run('COMMIT', (commitErr) => {
                        if (commitErr) {
                          db.run('ROLLBACK');
                          return resolve({ error: true, message: 'Commit failed.' });
                        }
                        resolve({ success: true });
                      });
                    }
                  );
                }
              );
            });
          } catch (ex: any) {
            db.run('ROLLBACK');
            resolve({ error: true, message: ex.message });
          }
        });
      });
    });
  });

  // Transaction IPC Handler for saving a new cash_out record
  ipcMain.handle('cash-out-create', async (_event, item: any) => {
    return new Promise((resolve) => {
      const db = getDatabase();
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', async (err) => {
          if (err) return resolve({ error: true, message: err.message });

          try {
            // Get current account balance inside transaction
            db.get('SELECT current_balance FROM bank_accounts WHERE id = ?', [item.accountId], (balErr, acc: any) => {
              if (balErr || !acc) {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Selected bank account not found.' });
              }

              const balance = Number(acc.current_balance) || 0;
              if (balance < item.amount) {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Insufficient balance in selected account.' });
              }

              // Insert voucher
              const sql = `
                INSERT INTO cash_out (
                  voucher_number, date, paid_to, category, 
                  account_id, amount, reference, remarks, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')
              `;
              db.run(sql, [
                item.voucherNumber,
                item.date,
                item.paidTo,
                item.category,
                item.accountId,
                item.amount,
                item.reference || '',
                item.remarks || ''
              ], function(this: any, runErr: any) {
                if (runErr) {
                  db.run('ROLLBACK');
                  return resolve({ error: true, message: 'Cash Out insert failed: ' + runErr.message });
                }

                const voucherId = this.lastID;

                // Decrease balance
                db.run(
                  'UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?',
                  [item.amount, item.accountId],
                  (acctErr) => {
                    if (acctErr) {
                      db.run('ROLLBACK');
                      return resolve({ error: true, message: 'Account deduction failed: ' + acctErr.message });
                    }

                    db.run('COMMIT', (commitErr) => {
                      if (commitErr) {
                        db.run('ROLLBACK');
                        return resolve({ error: true, message: 'Commit failed.' });
                      }
                      resolve({ success: true, voucherId });
                    });
                  }
                );
              });
            });
          } catch (ex: any) {
            db.run('ROLLBACK');
            resolve({ error: true, message: ex.message });
          }
        });
      });
    });
  });

  // Transaction IPC Handler for updating an existing cash_out record
  ipcMain.handle('cash-out-update', async (_event, id: number, item: any) => {
    return new Promise((resolve) => {
      const db = getDatabase();
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', async (err) => {
          if (err) return resolve({ error: true, message: err.message });

          try {
            db.get('SELECT * FROM cash_out WHERE id = ?', [id], (fetchErr, old: any) => {
              if (fetchErr || !old) {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Old cash out voucher not found.' });
              }

              // Temporarily restore old deduction
              db.run(
                'UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?',
                [old.amount, old.account_id],
                (revertErr) => {
                  if (revertErr) {
                    db.run('ROLLBACK');
                    return resolve({ error: true, message: 'Balance restoration failed.' });
                  }

                  // Verify new balance is sufficient
                  db.get('SELECT current_balance FROM bank_accounts WHERE id = ?', [item.accountId], (balErr, acc: any) => {
                    if (balErr || !acc) {
                      db.run('ROLLBACK');
                      return resolve({ error: true, message: 'Selected bank account not found.' });
                    }

                    const balance = Number(acc.current_balance) || 0;
                    if (balance < item.amount) {
                      db.run('ROLLBACK');
                      return resolve({ error: true, message: 'Insufficient balance in selected account.' });
                    }

                    // Apply deduction
                    db.run(
                      'UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?',
                      [item.amount, item.accountId],
                      (applyErr) => {
                        if (applyErr) {
                          db.run('ROLLBACK');
                          return resolve({ error: true, message: 'Account balance deduction failed.' });
                        }

                        // Update voucher
                        const sql = `
                          UPDATE cash_out SET 
                            voucher_number = ?, date = ?, paid_to = ?, category = ?, 
                            account_id = ?, amount = ?, reference = ?, remarks = ?, 
                            updated_at = CURRENT_TIMESTAMP
                          WHERE id = ?
                        `;
                        db.run(sql, [
                          item.voucherNumber,
                          item.date,
                          item.paidTo,
                          item.category,
                          item.accountId,
                          item.amount,
                          item.reference || '',
                          item.remarks || '',
                          id
                        ], (upErr) => {
                          if (upErr) {
                            db.run('ROLLBACK');
                            return resolve({ error: true, message: 'Voucher update failed.' });
                          }

                          db.run('COMMIT', (commitErr) => {
                            if (commitErr) {
                              db.run('ROLLBACK');
                              return resolve({ error: true, message: 'Commit failed.' });
                            }
                            resolve({ success: true });
                          });
                        });
                      }
                    );
                  });
                }
              );
            });
          } catch (ex: any) {
            db.run('ROLLBACK');
            resolve({ error: true, message: ex.message });
          }
        });
      });
    });
  });

  // Transaction IPC Handler for cancelling a cash_out record
  ipcMain.handle('cash-out-cancel', async (_event, id: number) => {
    return new Promise((resolve) => {
      const db = getDatabase();
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', async (err) => {
          if (err) return resolve({ error: true, message: err.message });

          try {
            db.get('SELECT * FROM cash_out WHERE id = ?', [id], (fetchErr, old: any) => {
              if (fetchErr || !old) {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Voucher not found.' });
              }

              if (old.status === 'Cancelled') {
                db.run('ROLLBACK');
                return resolve({ error: true, message: 'Voucher already cancelled.' });
              }

              // Revert balance (add back)
              db.run(
                'UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?',
                [old.amount, old.account_id],
                (revertErr) => {
                  if (revertErr) {
                    db.run('ROLLBACK');
                    return resolve({ error: true, message: 'Balance restoration failed.' });
                  }

                  db.run(
                    "UPDATE cash_out SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [id],
                    (statusErr) => {
                      if (statusErr) {
                        db.run('ROLLBACK');
                        return resolve({ error: true, message: 'Status update failed.' });
                      }

                      db.run('COMMIT', (commitErr) => {
                        if (commitErr) {
                          db.run('ROLLBACK');
                          return resolve({ error: true, message: 'Commit failed.' });
                        }
                        resolve({ success: true });
                      });
                    }
                  );
                }
              );
            });
          } catch (ex: any) {
            db.run('ROLLBACK');
            resolve({ error: true, message: ex.message });
          }
        });
      });
    });
  });
}
