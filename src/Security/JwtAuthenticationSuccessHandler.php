<?php

namespace App\Security;

use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Http\Authentication\AuthenticationSuccessHandlerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Gesdinet\JWTRefreshTokenBundle\Generator\RefreshTokenGeneratorInterface;

class JwtAuthenticationSuccessHandler implements AuthenticationSuccessHandlerInterface
{
    private JWTTokenManagerInterface $jwtManager;

    private RefreshTokenGeneratorInterface $refreshTokenGenerator;

    public function __construct(JWTTokenManagerInterface $jwtManager,
                                RefreshTokenGeneratorInterface $refreshTokenGenerator
    )
    {
        $this->jwtManager = $jwtManager;
        $this->refreshTokenGenerator = $refreshTokenGenerator;
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token): Response
    {
        // Get the user object from the token
        $user = $token->getUser();

        // Get the user roles
        $roles = $user->getRoles();

        // Create the token payload
        $payload = [
            'username' => $user->getUserIdentifier(),
            'roles' => $roles,
            // Add any other data you want to include in the JWT payload
        ];

        // Generate the JWT token
        $jwtManager = $this->jwtManager;
        $jwtToken = $jwtManager->create($user, $payload);

        $refreshTokenTtl = strtotime('+1 month') - time();
        // Generate a refresh token
        $refreshToken = $this->refreshTokenGenerator->createForUserWithTtl($user, $refreshTokenTtl);
        $refreshTokenExpiration = new \DateTime('+1 month');

        // Create the response
        $data = [
            'token' => $jwtToken,
            'refresh_token' => $refreshToken->getRefreshToken(),
            'refresh_token_expiration' => $refreshTokenExpiration->getTimestamp(),
            'roles' => $roles
        ];
        return new JsonResponse($data, Response::HTTP_OK);    }
}
