"""
Support widget endpoints:
  - ChatView    : AI assistant that answers questions about BounceTrap (OpenAI).
  - ContactView : sends a contact-us message to the team via Resend.
Both are public so landing-page visitors can use them, with anonymous throttling.
"""
import logging

from django.conf import settings
from django.core.mail import EmailMessage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle

logger = logging.getLogger(__name__)


# Knowledge base — everything the assistant should know about the product.
BOUNCETRAP_SYSTEM_PROMPT = """You are the BounceTrap support assistant. You help visitors and customers understand and use BounceTrap. Be friendly, concise and accurate. Only answer based on the facts below; if you don't know something, say so and suggest using the contact form.

## What BounceTrap is
BounceTrap is an email verification and deliverability platform. It helps people clean email lists, stop bounces, and make sure their emails reach the inbox.

## Core features
- **Single Email Verification**: Check one address in real time through a 10-step pipeline (syntax, MX, disposable detection, role-based detection, SMTP/mailbox check) with a 0-100 deliverability score and a verdict (valid / invalid / risky / unknown). Costs 1 credit.
- **Bulk Email Verification**: Upload a CSV or TXT file and verify thousands of addresses in parallel. Auto-detects the email column, deduplicates, and returns a downloadable results file plus a list health grade (A-F).
- **Email Deliverability Checker**: Tests SPF, DKIM and DMARC records, MX health, and blacklist status for a domain.
- **SMTP Testing**: Tests an SMTP server's connectivity, STARTTLS/TLS, certificate validity and supported auth methods.
- **Domain Reputation Monitoring**: Add domains to monitor SPF/DMARC/DKIM/blacklists with a reputation score and history.
- **AI Deliverability Advisor**: Runs all checks on a domain and returns prioritised, step-by-step fixes.
- **Email Finder**: Finds the likely professional email for a person at a company. Costs 5 credits per search.
- **Inbox Placement Tester** and **Header Analyzer**: additional deliverability tools.
- **REST API & API keys**: integrate verification into your own apps. Webhooks supported.

## Pricing & credits (very important)
- BounceTrap is **pay-as-you-go with credits — no subscription, no monthly fees, and credits NEVER expire**. Accounts are never paused.
- New users get **100 free credits on signup**.
- Free plan: up to **20 verifications per day** (single + bulk combined), capped at 20 emails per bulk job.
- Paid credit bundles (one-time): $20 = 25,000 credits, $40 = 50,000, $70 = 100,000, $140 = 200,000, $230 = 400,000. Buying any bundle unlocks full feature access (bulk, API, PDF reports, teams, deliverability tools).
- 1 credit = 1 single email verification.

## Loyalty reward card
- Every credit purchase (any bundle or pack, any size) earns 1 stamp.
- Collect **10 stamps and you automatically get 25,000 free credits**. The card then resets.

## Payments
- Payments are made in USDT (Tether). Pick a plan or credit pack, choose a network — TRON (TRC20), BSC (BEP20), or Ethereum (ERC20) — send the exact USDT amount to the address shown, then paste your transaction hash.
- Credits are added once the deposit is verified on-chain (usually within a few minutes to a couple of hours).

## Accuracy & safety
- Verification never sends a real email to the address, so recipients are never contacted.
- Accuracy is over 98% on deliverable addresses.

## Getting started
- Sign up free at the registration page, verify your email, and you get 100 credits to try everything.

Keep answers short — a few sentences. Use plain language. If asked something off-topic or that you can't answer from the above, politely say you're not sure and recommend the "Contact us" form in this same widget."""


class SupportChatThrottle(AnonRateThrottle):
    scope = 'support_chat'
    rate = '20/min'


class ChatView(APIView):
    """POST /api/v1/support/chat/ — AI assistant answering questions about BounceTrap."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [SupportChatThrottle]

    def post(self, request):
        from openai import OpenAI

        messages = request.data.get('messages', [])
        if not isinstance(messages, list) or not messages:
            return Response({'detail': 'messages is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Keep only the last 12 turns and sanitise roles/content
        clean = []
        for m in messages[-12:]:
            role = m.get('role')
            content = (m.get('content') or '').strip()
            if role in ('user', 'assistant') and content:
                clean.append({'role': role, 'content': content[:2000]})
        if not clean:
            return Response({'detail': 'No valid messages.'}, status=status.HTTP_400_BAD_REQUEST)

        api_key = getattr(settings, 'OPENAI_API_KEY', '')
        if not api_key:
            return Response(
                {'reply': "The assistant isn't configured yet. Please use the Contact form to reach our team."},
                status=status.HTTP_200_OK,
            )

        try:
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model='gpt-4o-mini',
                max_tokens=400,
                temperature=0.3,
                messages=[{'role': 'system', 'content': BOUNCETRAP_SYSTEM_PROMPT}, *clean],
            )
            reply = response.choices[0].message.content
        except Exception as exc:
            logger.warning('Support chat failed: %s', exc)
            return Response(
                {'reply': "I'm having trouble right now. Please try again, or use the Contact form to reach our team."},
                status=status.HTTP_200_OK,
            )

        return Response({'reply': reply})


class ContactThrottle(AnonRateThrottle):
    scope = 'support_contact'
    rate = '5/min'


class ContactView(APIView):
    """POST /api/v1/support/contact/ — send a contact message to the team via Resend."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ContactThrottle]

    def post(self, request):
        name    = (request.data.get('name') or '').strip()
        email   = (request.data.get('email') or '').strip()
        message = (request.data.get('message') or '').strip()

        if not email or not message:
            return Response({'detail': 'Email and message are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if '@' not in email or len(message) < 5:
            return Response({'detail': 'Please enter a valid email and a longer message.'}, status=status.HTTP_400_BAD_REQUEST)

        to_email = getattr(settings, 'CONTACT_EMAIL', '') or settings.DEFAULT_FROM_EMAIL
        body = (
            f'New contact form submission from BounceTrap\n\n'
            f'Name:    {name or "(not provided)"}\n'
            f'Email:   {email}\n\n'
            f'Message:\n{message}\n'
        )

        try:
            mail = EmailMessage(
                subject=f'BounceTrap contact — {name or email}',
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[to_email],
                reply_to=[email],
            )
            mail.send(fail_silently=False)
        except Exception as exc:
            logger.error('Contact form email failed: %s', exc)
            return Response(
                {'detail': 'Could not send your message right now. Please email us directly.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({'detail': "Thanks! We've received your message and will reply by email soon."})
