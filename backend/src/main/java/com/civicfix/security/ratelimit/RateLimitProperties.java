package com.civicfix.security.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@ConfigurationProperties(prefix = "civicfix.rate-limit")
public class RateLimitProperties {

    private LimitConfig login = new LimitConfig(5, Duration.ofMinutes(15));
    private LimitConfig accountLogin = new LimitConfig(20, Duration.ofHours(1));
    private LimitConfig register = new LimitConfig(5, Duration.ofHours(1));
    private LimitConfig complaintCreate = new LimitConfig(10, Duration.ofMinutes(1));
    private LimitConfig upload = new LimitConfig(10, Duration.ofMinutes(1));
    private LimitConfig reverseGeocode = new LimitConfig(30, Duration.ofMinutes(1));

    public LimitConfig getLogin() {
        return login;
    }

    public void setLogin(LimitConfig login) {
        this.login = login;
    }

    public LimitConfig getAccountLogin() {
        return accountLogin;
    }

    public void setAccountLogin(LimitConfig accountLogin) {
        this.accountLogin = accountLogin;
    }

    public LimitConfig getRegister() {
        return register;
    }

    public void setRegister(LimitConfig register) {
        this.register = register;
    }

    public LimitConfig getComplaintCreate() {
        return complaintCreate;
    }

    public void setComplaintCreate(LimitConfig complaintCreate) {
        this.complaintCreate = complaintCreate;
    }

    public LimitConfig getUpload() {
        return upload;
    }

    public void setUpload(LimitConfig upload) {
        this.upload = upload;
    }

    public LimitConfig getReverseGeocode() {
        return reverseGeocode;
    }

    public void setReverseGeocode(LimitConfig reverseGeocode) {
        this.reverseGeocode = reverseGeocode;
    }

    public static class LimitConfig {
        private long capacity;
        private Duration duration;

        public LimitConfig() {
        }

        public LimitConfig(long capacity, Duration duration) {
            this.capacity = capacity;
            this.duration = duration;
        }

        public long getCapacity() {
            return capacity;
        }

        public void setCapacity(long capacity) {
            this.capacity = capacity;
        }

        public Duration getDuration() {
            return duration;
        }

        public void setDuration(Duration duration) {
            this.duration = duration;
        }
    }
}

