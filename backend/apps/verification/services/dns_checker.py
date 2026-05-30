"""Step 5 — MX record lookup via dnspython."""
import dns.resolver
import dns.exception


def get_mx_records(domain: str) -> list[str]:
    """Return sorted list of MX hostnames for domain, empty list if none found."""
    try:
        answers = dns.resolver.resolve(domain, 'MX', lifetime=10)
        records = sorted(answers, key=lambda r: r.preference)
        return [str(r.exchange).rstrip('.') for r in records]
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout, dns.exception.DNSException):
        return []


def check_mx(domain: str) -> tuple[bool, str]:
    """
    Returns (mx_found, primary_mx_hostname).
    mx_found=True means at least one MX record exists.
    """
    records = get_mx_records(domain)
    if records:
        return True, records[0]
    return False, ''
