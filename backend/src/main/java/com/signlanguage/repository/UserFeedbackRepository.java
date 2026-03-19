package com.signlanguage.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.signlanguage.model.UserFeedback;

@Repository
public interface UserFeedbackRepository extends JpaRepository<UserFeedback, Long> {

}
