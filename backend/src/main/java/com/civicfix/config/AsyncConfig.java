package com.civicfix.config;

import com.civicfix.ai.vision.VisionTriageAsyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
public class AsyncConfig {

    private static final Logger log = LoggerFactory.getLogger(AsyncConfig.class);

    @Bean(name = "visionTaskExecutor")
    public TaskExecutor visionTaskExecutor(@Value("${civicfix.async.mode:async}") String asyncMode) {
        if ("sync".equalsIgnoreCase(asyncMode)) {
            log.info("Initialized synchronous TaskExecutor for deterministic test execution.");
            return new SyncTaskExecutor();
        }

        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("vision-triage-");
        executor.setRejectedExecutionHandler((r, exec) -> {
            log.warn("Vision triage executor queue is full; task rejected.");
            if (r instanceof VisionTriageAsyncService.RejectableVisionTask task) {
                task.onRejected();
            }
        });
        executor.initialize();
        log.info("Initialized bounded ThreadPoolTaskExecutor for vision triage (core=2, max=4, queue=50).");
        return executor;
    }
}

