package com.signlanguage.service;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

import com.signlanguage.entity.Permission;
import com.signlanguage.entity.Role;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import com.signlanguage.entity.UserSignLanguage;
import com.signlanguage.repository.UserSLRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserSLRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserSignLanguage user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        Set<SimpleGrantedAuthority> authorities = user.getRoles().stream()
            .flatMap(role -> buildAuthorities(role).stream())
            .collect(Collectors.toCollection(HashSet::new));

        if (!user.isEmailVerified()) {
            authorities.add(new SimpleGrantedAuthority("EMAIL_UNVERIFIED"));
        }

        return new User(
                user.getUsername(),
                user.getPasswordHash(),
            authorities
        );
    }

    private Set<SimpleGrantedAuthority> buildAuthorities(Role role) {
    Set<SimpleGrantedAuthority> roleAuthorities = Set.of(new SimpleGrantedAuthority(role.getCode()));
    Set<SimpleGrantedAuthority> permissionAuthorities = role.getPermissions().stream()
        .map(Permission::getCode)
        .map(SimpleGrantedAuthority::new)
        .collect(Collectors.toSet());

    return java.util.stream.Stream.concat(roleAuthorities.stream(), permissionAuthorities.stream())
        .collect(Collectors.toSet());
    }
}