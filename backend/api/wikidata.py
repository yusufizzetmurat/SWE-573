"""
Wikidata API integration for tag enrichment
"""
import requests
from typing import Optional, Dict, List


WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php"


def fetch_wikidata_item(wikidata_id: str) -> Optional[Dict]:
    """
    Fetch information about a Wikidata item by its ID (e.g., "Q8476").
    
    Returns:
        Dictionary with label, description, and aliases, or None if not found
    """
    if not wikidata_id or not wikidata_id.startswith('Q'):
        return None
    
    try:
        params = {
            'action': 'wbgetentities',
            'ids': wikidata_id,
            'props': 'labels|descriptions|aliases',
            'languages': 'en',
            'format': 'json'
        }
        
        response = requests.get(WIKIDATA_API_URL, params=params, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        entities = data.get('entities', {})
        entity = entities.get(wikidata_id)
        
        if not entity:
            return None
        
        labels = entity.get('labels', {})
        descriptions = entity.get('descriptions', {})
        aliases = entity.get('aliases', {})
        
        return {
            'id': wikidata_id,
            'label': labels.get('en', {}).get('value') if labels.get('en') else None,
            'description': descriptions.get('en', {}).get('value') if descriptions.get('en') else None,
            'aliases': [alias.get('value') for alias in aliases.get('en', [])] if aliases.get('en') else []
        }
    except (requests.RequestException, KeyError, ValueError) as e:
        # Suppress 403 errors (rate limiting from Wikidata) - not critical
        if '403' not in str(e):
            print(f"Error fetching Wikidata item {wikidata_id}: {e}")
        return None


def search_wikidata_items(query: str, limit: int = 10) -> List[Dict]:
    """
    Search for Wikidata items by name.
    
    Returns:
        List of dictionaries with id, label, and description
    """
    try:
        params = {
            'action': 'wbsearchentities',
            'search': query,
            'language': 'en',
            'limit': limit,
            'format': 'json'
        }
        
        response = requests.get(WIKIDATA_API_URL, params=params, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        results = data.get('search', [])
        
        return [
            {
                'id': item.get('id'),
                'label': item.get('label'),
                'description': item.get('description')
            }
            for item in results
        ]
    except (requests.RequestException, KeyError) as e:
        # Suppress 403 errors (rate limiting from Wikidata) - not critical
        if '403' not in str(e):
            print(f"Error searching Wikidata for '{query}': {e}")
        return []


def enrich_tag_with_wikidata(tag_id: str) -> Optional[Dict]:
    """
    Enrich a tag with Wikidata information.
    Useful for getting descriptions and related information.
    """
    return fetch_wikidata_item(tag_id)

