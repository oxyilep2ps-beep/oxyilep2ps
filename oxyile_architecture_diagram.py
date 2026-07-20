"""
Oxyile Protocol - Enterprise Architecture Diagram Generator
-----------------------------------------------------------
Creates detailed architecture diagrams in BOTH:
  - PNG (high-resolution)
  - PDF

Why this file exists:
  - Can be run directly from terminal: python oxyile_architecture_diagram.py
  - Can be run from Jupyter: !python oxyile_architecture_diagram.py
  - Includes Graphviz "dot" auto-detection for Windows common install paths.
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path

from diagrams import Cluster, Diagram, Edge
from diagrams.onprem.client import User, Users
from diagrams.onprem.compute import Server
from diagrams.onprem.database import PostgreSQL
from diagrams.onprem.inmemory import Redis
from diagrams.onprem.monitoring import Prometheus
from diagrams.onprem.network import Nginx
from diagrams.onprem.queue import Kafka
from diagrams.programming.framework import Nextjs
from diagrams.programming.language import Python


def ensure_graphviz_dot() -> str:
    """
    Ensure Graphviz 'dot' executable is available.

    Returns:
      Absolute path to dot executable.

    Raises:
      RuntimeError with clear installation instructions if not found.
    """
    dot_path = shutil.which("dot")
    if dot_path:
        return dot_path

    windows_candidates = [
        r"C:\Program Files\Graphviz\bin\dot.exe",
        r"C:\Program Files (x86)\Graphviz\bin\dot.exe",
        r"C:\ProgramData\chocolatey\bin\dot.exe",
        r"C:\Users\%USERNAME%\AppData\Local\Programs\Graphviz\bin\dot.exe",
    ]

    for raw in windows_candidates:
        candidate = os.path.expandvars(raw)
        if Path(candidate).exists():
            graphviz_bin = str(Path(candidate).parent)
            os.environ["PATH"] = graphviz_bin + os.pathsep + os.environ.get("PATH", "")
            return candidate

    raise RuntimeError(
        "Graphviz 'dot' executable not found.\n"
        "Fix:\n"
        "  1) Install Graphviz:\n"
        "     - Windows (Chocolatey): choco install graphviz\n"
        "     - Or installer: https://graphviz.org/download/\n"
        "  2) Ensure Graphviz bin is on PATH (e.g. C:\\Program Files\\Graphviz\\bin)\n"
        "  3) Restart Jupyter kernel / terminal, then rerun this script."
    )


def build_diagram(output_name: str = "oxyile_protocol_enterprise_architecture_detailed") -> None:
    ensure_graphviz_dot()

    graph_attr = {
        "pad": "0.8",
        "splines": "spline",
        "nodesep": "0.7",
        "ranksep": "1.0",
        "fontname": "Inter",
        "fontsize": "14",
        "bgcolor": "#0B1220",
        "rankdir": "LR",
        "dpi": "320",
        "labelloc": "t",
        "labeljust": "c",
    }

    node_attr = {
        "fontname": "Inter",
        "fontsize": "10",
        "fontcolor": "#E5E7EB",
        "style": "filled,rounded",
        "fillcolor": "#111827",
        "color": "#334155",
        "penwidth": "1.2",
    }

    edge_attr = {
        "fontname": "Inter",
        "fontsize": "9",
        "fontcolor": "#CBD5E1",
        "color": "#64748B",
        "penwidth": "1.2",
    }

    with Diagram(
        "Oxyile Protocol - Detailed FinTech Enterprise Architecture",
        filename=output_name,
        show=False,
        outformat=["png", "pdf"],
        direction="LR",
        graph_attr=graph_attr,
        node_attr=node_attr,
        edge_attr=edge_attr,
    ):
        # 1) Actors
        with Cluster("Actors"):
            borrower = User("Borrower")
            investor = User("Investor")
            admin = Users("Platform Admin\n(Pitch Reviewer)")

        # 2) Frontend - Next.js on Vercel
        with Cluster("Frontend Layer - Next.js on Vercel"):
            waitlist_ui = Nextjs(
                "Waitlist UI\n(Open Banking consent,\nCo-applicant willingness,\nBlockchain importance)"
            )
            borrower_dashboard = Nextjs(
                "Borrower Dashboard\n(Collateral upload,\nloan requests,\nmandate linking)"
            )
            investor_marketplace = Nextjs(
                "Investor Marketplace\n(Role-aware handshakes,\nJIT Fund Escrow flow)"
            )
            admin_portal = Nextjs(
                "Admin Portal\n(Realtime collateral verification,\ncompliance preview,\nPDF export)"
            )
            success_pages = Nextjs(
                "Payment Success Pages\n(/handshake/success,\n/payments/mandate-complete)"
            )

        # 3) Backend core - Next.js API/Server actions
        with Cluster("Backend Core - Next.js API Routes & Server Actions"):
            api_gateway = Nginx("API Entry Layer\n(Vercel Edge / Next API)")

            with Cluster("Identity & Compliance Router"):
                waitlist_api = Server("POST /api/waitlist")
                auth_sessions = Server("Supabase Auth Session Resolver")
                compliance_rules = Server("KYC/AML + Role Validation")

            with Cluster("Escrow & JIT Funding Controller"):
                jit_initiate = Server("initiateJITFunding(handshakeId, amount)")
                jit_confirm = Server("confirmEscrowAndRoute(handshakeId)")
                borrower_complete = Server("completeBorrowerBankLink(handshakeId)")
                escrow_state_machine = Server(
                    "Handshake State Machine\nPENDING -> FUNDED -> ACTIVE"
                )

            with Cluster("Admin Collateral Verification Services"):
                admin_collateral_list = Server("listPendingCollateralVerifications()")
                admin_collateral_verify = Server(
                    "verifyCollateralAsset()\n(approved_value, max_ltv=70%)"
                )
                admin_collateral_reject = Server("rejectCollateralAsset()")
                admin_pdf_export = Python("Waitlist/Profile PDF Generator")

            with Cluster("Web3 Polygon Relayer"):
                relayer_service = Server(
                    "Relayer Service\n(process.env.POLYGON_PRIVATE_KEY\nisolated server-side use)"
                )
                agreement_hash = Server("Agreement Hashing\n(Handshake + EMI terms)")
                chain_tx_submit = Server("Transaction Submitter\n(Amoy RPC)")

        # 4) Supabase
        with Cluster("Supabase - PostgreSQL + Realtime + Auth"):
            supabase_auth = Server("Auth + RLS Policies")
            supabase_db = PostgreSQL(
                "Core PostgreSQL\n(users, profiles,\nwaitlist, handshakes,\ncollateral tracking,\nmandates, tx hashes)"
            )
            supabase_realtime = Server("Realtime WebSockets\n(postgres_changes)")
            supabase_storage = Server("Storage Buckets\n(collateral docs)")

        # 5) External APIs/services
        with Cluster("External APIs & Services"):
            resend = Server("Resend API\n(Alerts, verifications)")
            gocardless = Server(
                "GoCardless API\n(Open Banking,\nJIT checkout,\nclient money escrow,\nDD mandates)"
            )
            polygon_amoy = Server("Polygon Amoy Testnet\n(Immutable ledger)")

        # Optional ops/service layer
        with Cluster("Platform Reliability & Async (Optional Enterprise Layer)"):
            event_bus = Kafka("Event Stream")
            cache = Redis("Session/Response Cache")
            observability = Prometheus("Monitoring/Alerting")

        # Actor -> frontend
        borrower >> Edge(label="onboards + submits waitlist answers") >> waitlist_ui
        borrower >> Edge(label="uploads collateral + links bank") >> borrower_dashboard
        investor >> Edge(label="reviews marketplace + funds escrow") >> investor_marketplace
        admin >> Edge(label="reviews pitch/compliance + verifies collateral") >> admin_portal

        # Frontend -> API gateway
        waitlist_ui >> Edge(label="HTTPS JSON form submit") >> api_gateway
        borrower_dashboard >> Edge(label="handshake/collateral actions") >> api_gateway
        investor_marketplace >> Edge(label="JIT funding + role-based actions") >> api_gateway
        admin_portal >> Edge(label="verification decisions + PDF export") >> api_gateway
        success_pages >> Edge(label="post-payment callbacks") >> api_gateway

        # Gateway -> backend domains
        api_gateway >> waitlist_api
        api_gateway >> auth_sessions
        api_gateway >> compliance_rules
        api_gateway >> jit_initiate
        api_gateway >> jit_confirm
        api_gateway >> borrower_complete
        api_gateway >> escrow_state_machine
        api_gateway >> admin_collateral_list
        api_gateway >> admin_collateral_verify
        api_gateway >> admin_collateral_reject
        api_gateway >> admin_pdf_export

        # Backend -> Supabase
        auth_sessions >> Edge(label="session validation") >> supabase_auth
        compliance_rules >> Edge(label="RLS-aware access checks") >> supabase_auth
        supabase_auth >> Edge(label="policy-enforced SQL access") >> supabase_db
        waitlist_api >> Edge(label="insert waitlist + compliance preferences") >> supabase_db
        admin_collateral_list >> Edge(label="read pending collateral queue") >> supabase_db
        admin_collateral_verify >> Edge(label="update verified values + max_ltv_amount") >> supabase_db
        admin_collateral_reject >> Edge(label="set collateral_status=rejected") >> supabase_db
        escrow_state_machine >> Edge(label="persist PENDING/FUNDED/ACTIVE transitions") >> supabase_db
        borrower_dashboard >> Edge(label="upload docs path references") >> supabase_storage
        supabase_storage >> Edge(label="signed URL resolution") >> admin_portal

        # Realtime wiring
        supabase_db >> Edge(label="postgres_changes feed") >> supabase_realtime
        supabase_realtime >> Edge(label="live pending verification updates") >> admin_portal
        supabase_realtime >> Edge(label="handshake status live updates") >> investor_marketplace
        supabase_realtime >> Edge(label="borrower-side status updates") >> borrower_dashboard

        # External integrations
        waitlist_api >> Edge(label="email confirmations + alerts") >> resend

        jit_initiate >> Edge(label="create billing request + checkout URL") >> gocardless
        gocardless >> Edge(label="checkout completion callback") >> jit_confirm
        borrower_complete >> Edge(label="create/activate mandate & subscription") >> gocardless

        jit_confirm >> Edge(label="trigger relayer path") >> relayer_service
        borrower_complete >> Edge(label="final on-chain anchor call") >> relayer_service
        relayer_service >> agreement_hash
        agreement_hash >> chain_tx_submit
        chain_tx_submit >> Edge(label="broadcast tx") >> polygon_amoy
        polygon_amoy >> Edge(label="confirmed tx hash") >> relayer_service
        relayer_service >> Edge(label="persist tx hash in handshakes") >> supabase_db

        # PDF exports
        admin_portal >> Edge(label="export waitlist/pitch compliance profile") >> admin_pdf_export
        admin_pdf_export >> Edge(label="rendered PDF artifact") >> admin

        # Critical flow highlighting
        borrower_dashboard >> Edge(
            color="#22D3EE", penwidth="2.0", label="FLOW 1: collateral docs upload"
        ) >> supabase_storage
        supabase_realtime >> Edge(
            color="#22D3EE", penwidth="2.0", label="FLOW 1: realtime alert -> admin queue"
        ) >> admin_portal
        admin_portal >> Edge(
            color="#22D3EE", penwidth="2.0", label="FLOW 1: verify/reject collateral"
        ) >> admin_collateral_verify

        investor_marketplace >> Edge(
            color="#34D399", penwidth="2.0", label='FLOW 2: click "Fund Escrow"'
        ) >> jit_initiate
        jit_initiate >> Edge(
            color="#34D399", penwidth="2.0", label="FLOW 2: GoCardless JIT checkout"
        ) >> gocardless
        gocardless >> Edge(
            color="#34D399", penwidth="2.0", label="FLOW 2: funds held in escrow"
        ) >> jit_confirm
        jit_confirm >> Edge(
            color="#34D399", penwidth="2.0", label="FLOW 2: payout routing to borrower phase"
        ) >> borrower_complete

        gocardless >> Edge(
            color="#F59E0B", penwidth="2.0", label="FLOW 3: success webhook/callback"
        ) >> relayer_service
        relayer_service >> Edge(
            color="#F59E0B", penwidth="2.0", label="FLOW 3: hash agreement + mint tx"
        ) >> polygon_amoy
        polygon_amoy >> Edge(
            color="#F59E0B", penwidth="2.0", label="FLOW 3: tx hash -> Supabase"
        ) >> supabase_db

        waitlist_ui >> Edge(
            color="#A78BFA", penwidth="2.0", label="FLOW 4: waitlist compliance data capture"
        ) >> waitlist_api
        waitlist_api >> Edge(
            color="#A78BFA", penwidth="2.0", label="FLOW 4: store + expose for admin preview"
        ) >> supabase_db
        admin_portal >> Edge(
            color="#A78BFA", penwidth="2.0", label="FLOW 4: pitch/compliance PDF export"
        ) >> admin_pdf_export

        # Ops/telemetry edges
        api_gateway >> event_bus
        jit_confirm >> event_bus
        borrower_complete >> event_bus
        event_bus >> observability
        api_gateway >> cache
        cache >> observability


if __name__ == "__main__":
    out = "oxyile_protocol_enterprise_architecture_detailed"
    build_diagram(out)
    print("Architecture diagram generated successfully:")
    print(f"  - {out}.png")
    print(f"  - {out}.pdf")
