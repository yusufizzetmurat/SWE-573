"""
Performance monitoring utilities
"""
import time
import logging
from functools import wraps
from django.core.cache import cache
from django.db import connection

logger = logging.getLogger(__name__)


def track_performance(func):
    """
    Decorator to track function execution time and log slow operations
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        start_queries = len(connection.queries)
        
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            duration = time.time() - start_time
            query_count = len(connection.queries) - start_queries
            
            # Log slow operations
            if duration > 1.0:
                logger.warning(
                    f"Slow operation: {func.__name__} took {duration:.3f}s "
                    f"({query_count} queries)"
                )
            
            # Log high query count
            if query_count > 10:
                logger.warning(
                    f"High query count: {func.__name__} executed {query_count} queries"
                )
    
    return wrapper


def cache_result(timeout=300):
    """
    Decorator to cache function results
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            result = cache.get(cache_key)
            
            if result is None:
                result = func(*args, **kwargs)
                cache.set(cache_key, result, timeout)
            
            return result
        return wrapper
    return decorator


def get_query_count():
    """Get current query count for the request"""
    return len(connection.queries)


def log_query_performance():
    """Log all queries executed in the current request"""
    queries = connection.queries
    if queries:
        total_time = sum(float(q['time']) for q in queries)
        logger.info(
            f"Query performance: {len(queries)} queries in {total_time:.3f}s"
        )
        for query in queries[-5:]:  # Log last 5 queries
            logger.debug(f"Query: {query['sql'][:100]}... ({query['time']}s)")

