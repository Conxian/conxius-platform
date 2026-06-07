import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor

# Use an environment override for real runs and a clearly non-secret mock default
# so this script remains runnable without embedding credential-like literals.
DB_URL = os.getenv(
    "ERP_SYNC_DB_URL",
    "postgresql://localhost:5432/erp_mock_db?sslmode=disable",
)

def sync_erp_to_bos():
    print("Starting ERP to BOS synchronization...")
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # 1. Fetch unpaid invoices from erp_mock
        cur.execute("""
            SELECT i.id, i.invoice_number, i.amount, i.currency, c.name as customer_name
            FROM erp_mock.invoices i
            JOIN erp_mock.customer_accounts c ON i.customer_id = c.id
            WHERE i.status = 'unpaid'
        """)
        invoices = cur.fetchall()
        print(f"Found {len(invoices)} unpaid invoices in ERP.")

        for inv in invoices:
            print(f"Processing invoice {inv['invoice_number']} for {inv['customer_name']}...")

            # 2. Simulate settlement/processing in BOS
            # Insert into cnx_bos.cxn_external_settlement_logs
            cur.execute("""
                INSERT INTO cnx_bos.cxn_external_settlement_logs
                (native_tx_hash, external_tx_reference, settlement_network_origin, fiat_value_pegged, currency_code, metadata)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                f"tx-{inv['invoice_number'].lower()}",
                inv['invoice_number'],
                'ERP_MOCK_NET',
                inv['amount'],
                inv['currency'],
                json.dumps({'customer': inv['customer_name'], 'erp_source': 'erp_mock'})
            ))
            log_id = cur.fetchone()['id']
            print(f"Created settlement log {log_id} in BOS.")

            # 3. Update invoice status in ERP to 'paid' (or 'processing')
            cur.execute("UPDATE erp_mock.invoices SET status = 'processing' WHERE id = %s", (inv['id'],))

            # 4. Record a metric in operational_metrics
            cur.execute("""
                INSERT INTO cnx_bos.operational_metrics (metric_name, metric_value, agent_id)
                VALUES (%s, %s, %s)
            """, ('erp_sync_value_usd', inv['amount'], 'erp_sync_agent_01'))

        conn.commit()
        print("Synchronization completed successfully.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error during synchronization: {e}")
        if 'conn' in locals():
            conn.rollback()

if __name__ == "__main__":
    sync_erp_to_bos()
