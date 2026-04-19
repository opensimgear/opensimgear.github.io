Feature: Aluminium rig planner
  Scenario: Planner loads with GT defaults
    Given I open the aluminium rig planner page
    Then I should see the aluminium rig planner heading
    And I should see the profile-only cut list
    And the planner page should match the visual baseline

  Scenario: Planner updates guidance and preview after geometry changes
    Given I open the aluminium rig planner page
    When I change the planner wheel reach
    Then I should see posture guidance mentioning wheel reach
    And I should see the 3D rig preview
