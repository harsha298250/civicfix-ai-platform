package com.civicfix.security.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class RateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(RateLimiterService.class);

    private final ConcurrentMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public Bucket resolveBucket(String key, long capacity, Duration duration) {
        return buckets.computeIfAbsent(key, k -> createBucket(capacity, duration));
    }

    private Bucket createBucket(long capacity, Duration duration) {
        Bandwidth limit = Bandwidth.builder()
                .capacity(capacity)
                .refillIntervally(capacity, duration)
                .build();
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }

    public ConsumptionProbe tryConsume(String key, long capacity, Duration duration) {
        Bucket bucket = resolveBucket(key, capacity, duration);
        return bucket.tryConsumeAndReturnRemaining(1);
    }

    public void reset(String key) {
        buckets.remove(key);
    }

    public void clearAll() {
        buckets.clear();
    }
}
