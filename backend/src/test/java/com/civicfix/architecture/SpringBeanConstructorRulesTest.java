package com.civicfix.architecture;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Controller;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Constructor;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class SpringBeanConstructorRulesTest {

    @Test
    @DisplayName("Every Spring-managed bean with multiple constructors must have at least one annotated with @Autowired")
    void testEverySpringManagedBeanHasUnambiguousConstructor() throws Exception {
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);

        scanner.addIncludeFilter(new AnnotationTypeFilter(Component.class));
        scanner.addIncludeFilter(new AnnotationTypeFilter(Service.class));
        scanner.addIncludeFilter(new AnnotationTypeFilter(Repository.class));
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        scanner.addIncludeFilter(new AnnotationTypeFilter(Controller.class));
        scanner.addIncludeFilter(new AnnotationTypeFilter(Configuration.class));
        scanner.addIncludeFilter(new AnnotationTypeFilter(ControllerAdvice.class));

        Set<BeanDefinition> candidateBeans = scanner.findCandidateComponents("com.civicfix");

        List<String> violations = new ArrayList<>();

        for (BeanDefinition bd : candidateBeans) {
            Class<?> beanClass = Class.forName(bd.getBeanClassName());
            violations.addAll(checkClassForConstructorAmbiguity(beanClass));
        }

        assertTrue(violations.isEmpty(),
                "Found Spring-managed classes with ambiguous constructors:\n" +
                String.join("\n", violations));
    }

    @Test
    @DisplayName("Proof of detector: flags classes with multiple constructors lacking @Autowired")
    void testDetectorFlagsAmbiguousConstructors() {
        @SuppressWarnings("unused")
        class FakeAmbiguousComponent {
            public FakeAmbiguousComponent() {}
            public FakeAmbiguousComponent(String dummy) {}
        }

        List<String> violations = checkClassForConstructorAmbiguity(FakeAmbiguousComponent.class);
        assertEquals(1, violations.size(), "Detector must flag class with 2 constructors and no @Autowired");
        assertTrue(violations.get(0).contains("has 2 constructors but none is annotated with @Autowired"));

        @SuppressWarnings("unused")
        class FakeValidComponent {
            @Autowired
            public FakeValidComponent() {}
            public FakeValidComponent(String dummy) {}
        }

        List<String> validViolations = checkClassForConstructorAmbiguity(FakeValidComponent.class);
        assertTrue(validViolations.isEmpty(), "Detector must allow class when one constructor is annotated with @Autowired");
    }

    private List<String> checkClassForConstructorAmbiguity(Class<?> beanClass) {
        List<String> violations = new ArrayList<>();
        if (beanClass.isInterface() || Modifier.isAbstract(beanClass.getModifiers())) {
            return violations;
        }

        Constructor<?>[] constructors = beanClass.getDeclaredConstructors();
        List<Constructor<?>> candidateCtors = new ArrayList<>();
        for (Constructor<?> ctor : constructors) {
            if (!Modifier.isPrivate(ctor.getModifiers())) {
                candidateCtors.add(ctor);
            }
        }

        if (candidateCtors.size() > 1) {
            boolean hasAutowired = false;
            for (Constructor<?> ctor : candidateCtors) {
                if (ctor.isAnnotationPresent(Autowired.class)) {
                    hasAutowired = true;
                    break;
                }
            }
            if (!hasAutowired) {
                violations.add(beanClass.getName() + " has " + candidateCtors.size() +
                        " constructors but none is annotated with @Autowired.");
            }
        }
        return violations;
    }
}
